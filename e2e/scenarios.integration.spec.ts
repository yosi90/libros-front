import { expect, integrationTest as test } from './fixtures/integration';
import { credentialsFor, loginThroughApi, loginThroughUi } from './support/auth';
import { fixture } from './support/qa-reset';
import { forceRealtimeDisconnect, installRealtimeProbe, realtimeObservations, resumeRealtimeConnection, waitForRealtimeObservation } from './support/realtime-probe';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('perfiles deterministas del backend QA @integration', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test('baseline publica exactamente la matriz estable de aliases', async ({ qaFixtures }) => {
        expect(Object.keys(qaFixtures.Fixtures)).toHaveLength(36);
        expect(fixture(qaFixtures, 'scene.rtf-2297').Id).toBeGreaterThan(0);
        expect(fixture(qaFixtures, 'collection.member-a.read').Id).toBeGreaterThan(0);
    });

    test('expired-sessions entrega un access token ya caducado', async ({ request, qaEnvironment, qaScenario }) => {
        const fixtures = await qaScenario.apply('expired-sessions');
        const credentials = credentialsFor('userA', fixtures);
        expect(credentials).not.toBeNull();
        const token = await loginThroughApi(request, qaEnvironment, credentials!);
        const response = await request.get(`${qaEnvironment.apiUrl}auth/user`, { headers: bearer(token) });
        expect(response.status()).toBe(401);
        expect(await errorCode(response)).toBe('access_token_expired');
    });

    test('rate-limited devuelve el 429 observable para member-a', async ({ request, qaEnvironment, qaScenario }) => {
        const fixtures = await qaScenario.apply('rate-limited');
        const credentials = credentialsFor('userA', fixtures);
        expect(credentials).not.toBeNull();
        const token = await loginThroughApi(request, qaEnvironment, credentials!);
        const response = await request.get(`${qaEnvironment.apiUrl}comunidad/resumen`, { headers: bearer(token) });
        expect(response.status()).toBe(429);
        expect(await errorCode(response)).toBe('too_many_requests');
    });

    test('version-conflict rechaza reutilizar una versión de voto obsoleta', async ({ request, qaEnvironment, qaScenario }) => {
        const fixtures = await qaScenario.apply('version-conflict');
        const credentials = credentialsFor('moderator', fixtures);
        expect(credentials).not.toBeNull();
        const token = await loginThroughApi(request, qaEnvironment, credentials!);
        const clubId = fixture(fixtures, 'club.primary').Id;
        const pollId = fixture(fixtures, 'club.poll').Id;
        const pollsResponse = await request.get(`${qaEnvironment.apiUrl}clubes-lectura/${clubId}/encuestas`, { headers: bearer(token) });
        expect(pollsResponse.ok()).toBeTruthy();
        const polls = await pollsResponse.json() as { Encuestas: Array<{ Id: number; MiVotoId: number | null; MiVotoVersion: string | null; Opciones: Array<{ Id: number }> }> };
        const poll = polls.Encuestas.find(item => item.Id === pollId);
        expect(poll?.MiVotoVersion).toBeTruthy();
        const optionId = poll!.Opciones.find(option => option.Id !== poll!.MiVotoId)?.Id;
        expect(optionId).toBeTruthy();
        const voteUrl = `${qaEnvironment.apiUrl}clubes-lectura/${clubId}/encuestas/${pollId}/voto`;
        const first = await request.put(voteUrl, { headers: bearer(token), data: { OpcionId: optionId, Version: poll!.MiVotoVersion } });
        expect(first.ok()).toBeTruthy();
        const stale = await request.put(voteUrl, { headers: bearer(token), data: { OpcionId: poll!.MiVotoId, Version: poll!.MiVotoVersion } });
        expect(stale.status()).toBe(409);
        expect(await errorCode(stale)).toBe('club_poll_vote_conflict');
    });

    test('realtime-recovery deduplica, reconecta y reconcilia por REST en el navegador', async ({ page, request, qaEnvironment, qaScenario, expectedHandledHttpErrors }, testInfo) => {
        test.setTimeout(240_000);
        const phases: Record<string, unknown> = {};
        const fixtures = await qaScenario.apply('realtime-recovery');
        expectedHandledHttpErrors.push({
            method: 'PATCH',
            url: `${qaEnvironment.apiUrl}chat/preferencias-flotantes`,
            status: 409,
            code: 'chat_preferences_conflict',
            recovery: [
                { method: 'GET', status: 200 },
                { method: 'PATCH', status: 200 }
            ],
            required: false
        });
        try {
            expect(fixture(fixtures, 'chat.primary').Metadata['Delivery']).toBe('duplicate-and-reordered');
            const userA = credentialsFor('userA', fixtures);
            const userB = credentialsFor('userB', fixtures);
            expect(userA).not.toBeNull();
            expect(userB).not.toBeNull();
            const token = await loginThroughApi(request, qaEnvironment, userB!);
            const policyAcceptance = await request.post(`${qaEnvironment.apiUrl}moderacion/politicas/creacion/aceptar`, { headers: bearer(token) });
            expect(policyAcceptance.status()).toBe(200);
            const policyBody = await policyAcceptance.json() as { success?: boolean; Tipo?: string; VersionId?: number };
            expect(policyBody).toMatchObject({ success: true, Tipo: 'creacion' });
            expect(policyBody.VersionId).toBeGreaterThan(0);
            const conversationId = fixture(fixtures, 'chat.primary').Id;
            await installRealtimeProbe(page);
            await loginThroughUi(page, userA!);
            await waitForRealtimeObservation(page, { kind: 'connection', channel: 'chat', status: 'connected' });

            const historyUrl = `${qaEnvironment.apiUrl}chat/conversaciones/${conversationId}/mensajes`;
            const initialHistory = page.waitForResponse(response => response.url().startsWith(historyUrl) && response.request().method() === 'GET' && response.ok());
            await page.goto(`/dashboard/community/messages/${conversationId}`);
            await initialHistory;
            phases['connected-and-loaded'] = await realtimeObservations(page);
            const observationStart = (await realtimeObservations(page)).length;
            const markers = Array.from({ length: 4 }, (_, index) => `qa-recovery-${Date.now()}-${index}`);
            const postedMessageIds: number[] = [];
            for (const marker of markers) {
                const response = await request.post(historyUrl, {
                    headers: bearer(token),
                    data: { CuerpoMarkdown: marker, ClientMessageId: crypto.randomUUID() }
                });
                expect(response.status()).toBe(201);
                const body = await response.json() as { Mensaje?: { Id?: number; CuerpoMarkdown?: string } };
                expect(body.Mensaje?.CuerpoMarkdown).toBe(marker);
                expect(body.Mensaje?.Id).toBeGreaterThan(0);
                postedMessageIds.push(body.Mensaje!.Id!);
            }

            await expect.poll(async () => {
                const observations = (await realtimeObservations(page)).slice(observationStart);
                const appliedIds = [...new Set(observations
                    .filter(item => item.kind === 'event-applied'
                        && item.eventType === 'message.created'
                        && item.conversationId === conversationId
                        && item.messageId !== null
                        && item.messageId !== undefined
                        && postedMessageIds.includes(item.messageId))
                    .map(item => item.eventId!))];
                return appliedIds.filter(eventId => {
                    const sameEvent = observations.filter(item => item.eventId === eventId);
                    return sameEvent.filter(item => item.kind === 'frame-received').length === 2
                        && sameEvent.filter(item => item.kind === 'event-applied').length === 1
                        && sameEvent.filter(item => item.kind === 'event-duplicate').length === 1;
                }).length;
            }, { timeout: 45_000, message: 'El navegador debe observar duplicados y aplicar cada eventId una sola vez.' }).toBeGreaterThanOrEqual(markers.length);

            const delivered = (await realtimeObservations(page)).slice(observationStart)
                .filter(item => item.kind === 'event-applied'
                    && item.eventType === 'message.created'
                    && item.conversationId === conversationId
                    && item.messageId !== null
                    && item.messageId !== undefined
                    && postedMessageIds.includes(item.messageId));
            const eventIds = [...new Set(delivered.map(item => item.eventId!))];
            expect(eventIds).toHaveLength(markers.length);
            expect(eventIds.every(eventId => typeof eventId === 'string' && eventId.length > 0)).toBeTruthy();
            const deliveredMessageIds = [...new Set(delivered.map(item => item.messageId).filter((id): id is number => Number.isInteger(id)))];
            expect(new Set(deliveredMessageIds)).toEqual(new Set(postedMessageIds));
            const creationPosition = new Map(postedMessageIds.map((id, index) => [id, index]));
            const observedPositions = deliveredMessageIds.map(id => creationPosition.get(id)!);
            expect(observedPositions.some((position, index) => index > 0 && position < observedPositions[index - 1]), 'El perfil debe entregar al menos un mensaje fuera del orden de creación acreditado por payload.Id.').toBeTruthy();
            phases['duplicates-deduplicated-and-reordered'] = (await realtimeObservations(page)).slice(observationStart);
            for (const marker of markers)
                await expect(page.getByText(marker, { exact: true })).toHaveCount(1);

            const disconnectStart = (await realtimeObservations(page)).length;
            await forceRealtimeDisconnect(page, 'chat');
            await waitForRealtimeObservation(page, { kind: 'connection', channel: 'chat', status: 'closed' }, disconnectStart);
            phases['disconnected'] = (await realtimeObservations(page)).slice(disconnectStart);
            const offlineMarker = `qa-recovery-offline-${Date.now()}`;
            const offlineWrite = await request.post(historyUrl, {
                headers: bearer(token),
                data: { CuerpoMarkdown: offlineMarker, ClientMessageId: crypto.randomUUID() }
            });
            expect(offlineWrite.status()).toBe(201);
            await expect(page.getByText(offlineMarker, { exact: true })).toHaveCount(0);

            const reconciledHistory = page.waitForResponse(response => response.url().startsWith(historyUrl) && response.request().method() === 'GET' && response.ok());
            await resumeRealtimeConnection(page, 'chat');
            await waitForRealtimeObservation(page, { kind: 'connection', channel: 'chat', status: 'connected', reconnected: true }, disconnectStart);
            const reconciledResponse = await reconciledHistory;
            const reconciled = await reconciledResponse.json() as { Mensajes?: Array<{ CuerpoMarkdown?: string }> };
            expect(reconciled.Mensajes?.filter(message => message.CuerpoMarkdown === offlineMarker)).toHaveLength(1);
            await expect(page.getByText(offlineMarker, { exact: true })).toHaveCount(1);
            phases['reconnected-and-reconciled'] = (await realtimeObservations(page)).slice(disconnectStart);
        } catch (error) {
            try { phases['failure'] = await realtimeObservations(page); }
            catch { phases['failure'] = 'La pagina ya no estaba disponible.'; }
            throw error;
        } finally {
            await testInfo.attach('realtime-observations-by-phase', {
                body: JSON.stringify(phases, null, 2),
                contentType: 'application/json'
            });
        }
    });
});

function bearer(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

async function errorCode(response: { json(): Promise<unknown> }): Promise<string | null> {
    const body = await response.json() as { code?: string };
    return body.code ?? null;
}
