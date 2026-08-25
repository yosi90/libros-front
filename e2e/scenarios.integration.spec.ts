import { expect, integrationTest as test } from './fixtures/integration';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { credentialsFor, loginThroughApi, loginThroughUi } from './support/auth';
import { fixture } from './support/qa-reset';
import { forceRealtimeDisconnect, installRealtimeProbe, realtimeObservations, realtimeProbeSnapshot, resumeRealtimeConnection, waitForCurrentRealtimeConnectionSnapshot, waitForRealtimeObservation } from './support/realtime-probe';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('perfiles deterministas del backend QA @integration', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });

    test('baseline publica exactamente la matriz estable de aliases', async ({ qaFixtures }) => {
        expect(Object.keys(qaFixtures.Fixtures)).toHaveLength(37);
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

    test('el backup administrativo aplica autorización y entrega un ZIP sin incorporarlo a evidencias', async ({ request, qaEnvironment, qaFixtures }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'El contrato binario y de autorización se acredita una sola vez.');
        const member = credentialsFor('userA', qaFixtures);
        const admin = credentialsFor('admin', qaFixtures);
        expect(member).not.toBeNull();
        expect(admin).not.toBeNull();

        const memberToken = await loginThroughApi(request, qaEnvironment, member!);
        const forbidden = await request.get(`${qaEnvironment.apiUrl}admin/backup`, { headers: bearer(memberToken) });
        expect(forbidden.status()).toBe(403);
        expect(await errorCode(forbidden)).toBe('admin_required');

        const adminToken = await loginThroughApi(request, qaEnvironment, admin!);
        const backup = await request.get(`${qaEnvironment.apiUrl}admin/backup`, { headers: bearer(adminToken) });
        expect(backup.status()).toBe(200);
        expect(backup.headers()['content-type']).toContain('application/zip');
        expect(backup.headers()['content-disposition']).toMatch(/filename(?:\*?=).*\.zip/i);
        const bytes = await backup.body();
        expect(bytes.byteLength).toBeGreaterThan(0);
        bytes.fill(0);
        // El contenido solo se mide y sobrescribe en memoria; nunca se adjunta ni serializa como evidencia.
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
            const capabilitiesRequest = page.waitForResponse(response => response.url() === `${qaEnvironment.apiUrl}comunidad/capacidades`
                && response.request().method() === 'GET');
            await loginThroughUi(page, userA!);
            const capabilitiesResponse = await capabilitiesRequest;
            const capabilitiesBody = await capabilitiesResponse.json() as {
                Conservadora?: boolean;
                VersionCliente?: string | null;
                Capacidades?: { chat?: { Activa?: boolean }; realtime?: { Activa?: boolean } };
            };
            const declaredClientVersion = capabilitiesResponse.request().headers()['x-client-version'] ?? null;
            phases['capabilities'] = {
                status: capabilitiesResponse.status(),
                clientVersion: declaredClientVersion,
                body: capabilitiesBody
            };
            expect(capabilitiesResponse.status(), 'QA debe aceptar la versión declarada por el frontend').toBe(200);
            expect(declaredClientVersion).toMatch(/^\d+\.\d+\.\d+$/);
            expect(capabilitiesBody).toMatchObject({
                Conservadora: false,
                VersionCliente: declaredClientVersion,
                Capacidades: { chat: { Activa: true }, realtime: { Activa: true } }
            });
            const historyUrl = `${qaEnvironment.apiUrl}chat/conversaciones/${conversationId}/mensajes`;
            await page.getByRole('button', { name: 'Abrir chat' }).click();
            const conversationLink = page.locator(`a[href="/dashboard/community/messages/${conversationId}"]`);
            await expect(conversationLink).toBeVisible();
            const initialHistory = page.waitForResponse(response => response.url().startsWith(historyUrl) && response.request().method() === 'GET' && response.ok());
            await conversationLink.click();
            await initialHistory;
            phases['connected-and-loaded'] = await waitForCurrentRealtimeConnectionSnapshot(page, 'chat');

            const preStimulus = await waitForCurrentRealtimeConnectionSnapshot(page, 'chat');
            const stimulusDocumentId = preStimulus.activeDocumentId!;
            expect(preStimulus.observations.some(observation => observation.documentId === stimulusDocumentId
                && observation.kind === 'connection'
                && observation.channel === 'chat'
                && observation.status === 'connected'), 'La generacion vigente debe acreditar connection:connected antes de publicar.').toBeTruthy();
            phases['pre-stimulus'] = preStimulus;
            const observationStart = preStimulus.observations.length;
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
                    .filter(item => item.documentId === stimulusDocumentId
                        && item.kind === 'event-applied'
                        && item.eventType === 'message.created'
                        && item.conversationId === conversationId
                        && item.messageId !== null
                        && item.messageId !== undefined
                        && postedMessageIds.includes(item.messageId))
                    .map(item => item.eventId!))];
                return appliedIds.filter(eventId => {
                    const sameEvent = observations.filter(item => item.documentId === stimulusDocumentId && item.eventId === eventId);
                    return sameEvent.filter(item => item.kind === 'frame-received').length >= 2
                        && sameEvent.filter(item => item.kind === 'event-applied').length === 1
                        && sameEvent.filter(item => item.kind === 'event-duplicate').length >= 1;
                }).length;
            }, { timeout: 60_000, message: 'El navegador debe observar duplicados y aplicar cada eventId una sola vez.' }).toBeGreaterThanOrEqual(markers.length);

            const delivered = (await realtimeObservations(page)).slice(observationStart)
                .filter(item => item.documentId === stimulusDocumentId
                    && item.kind === 'event-applied'
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
            const deliveredSnapshot = await realtimeProbeSnapshot(page);
            expect(deliveredSnapshot.activeDocumentId, 'El documento no debe sustituirse durante el lote realtime.').toBe(stimulusDocumentId);
            phases['duplicates-deduplicated-and-reordered'] = deliveredSnapshot;
            for (const [index, marker] of markers.entries()) {
                const renderedMessage = page.locator(`article[data-message-id="${postedMessageIds[index]}"]`);
                await expect(renderedMessage).toHaveCount(1);
                await expect(renderedMessage.getByText(marker, { exact: true })).toHaveCount(1);
            }

            const disconnectStart = (await realtimeObservations(page)).length;
            await forceRealtimeDisconnect(page, 'chat');
            await waitForRealtimeObservation(page, { documentId: stimulusDocumentId, kind: 'connection', channel: 'chat', status: 'closed' }, disconnectStart);
            phases['disconnected'] = await realtimeProbeSnapshot(page);
            const offlineMarker = `qa-recovery-offline-${Date.now()}`;
            const offlineWrite = await request.post(historyUrl, {
                headers: bearer(token),
                data: { CuerpoMarkdown: offlineMarker, ClientMessageId: crypto.randomUUID() }
            });
            expect(offlineWrite.status()).toBe(201);
            const offlineBody = await offlineWrite.json() as { Mensaje?: { Id?: number; CuerpoMarkdown?: string } };
            expect(offlineBody.Mensaje?.CuerpoMarkdown).toBe(offlineMarker);
            expect(offlineBody.Mensaje?.Id).toBeGreaterThan(0);
            const offlineMessageId = offlineBody.Mensaje!.Id!;
            const offlineMessage = page.locator(`article[data-message-id="${offlineMessageId}"]`);
            await expect(offlineMessage).toHaveCount(0);

            const reconciledHistory = page.waitForResponse(response => response.url().startsWith(historyUrl) && response.request().method() === 'GET' && response.ok());
            await resumeRealtimeConnection(page, 'chat');
            await waitForRealtimeObservation(page, { documentId: stimulusDocumentId, kind: 'connection', channel: 'chat', status: 'connected', reconnected: true }, disconnectStart);
            const reconciledResponse = await reconciledHistory;
            const reconciled = await reconciledResponse.json() as { Mensajes?: Array<{ Id?: number; CuerpoMarkdown?: string }> };
            expect(reconciled.Mensajes?.filter(message => message.Id === offlineMessageId && message.CuerpoMarkdown === offlineMarker)).toHaveLength(1);
            await expect(offlineMessage).toHaveCount(1);
            await expect(offlineMessage.getByText(offlineMarker, { exact: true })).toHaveCount(1);
            phases['reconnected-and-reconciled'] = await realtimeProbeSnapshot(page);
        } catch (error) {
            try { phases['failure'] = await realtimeProbeSnapshot(page); }
            catch { phases['failure'] = 'La pagina ya no estaba disponible.'; }
            throw error;
        } finally {
            const evidencePath = testInfo.outputPath('realtime-observations.json');
            await mkdir(path.dirname(evidencePath), { recursive: true });
            await writeFile(evidencePath, JSON.stringify(phases, null, 2), 'utf8');
            await testInfo.attach('realtime-observations-by-phase', {
                path: evidencePath,
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
