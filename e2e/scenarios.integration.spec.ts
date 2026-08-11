import { expect, integrationTest as test, applyQaScenario } from './fixtures/integration';
import { credentialsFor, loginThroughApi, loginThroughUi } from './support/auth';
import { fixture } from './support/qa-reset';
import { forceRealtimeDisconnect, installRealtimeProbe, realtimeObservations, resumeRealtimeConnection, waitForRealtimeObservation } from './support/realtime-probe';

test.describe('perfiles deterministas del backend QA @integration', () => {
    test.describe.configure({ mode: 'serial' });

    test('baseline publica exactamente la matriz estable de aliases', async ({ qaFixtures }) => {
        expect(Object.keys(qaFixtures.Fixtures)).toHaveLength(36);
        expect(fixture(qaFixtures, 'scene.rtf-2297').Id).toBeGreaterThan(0);
        expect(fixture(qaFixtures, 'collection.member-a.read').Id).toBeGreaterThan(0);
    });

    test('expired-sessions entrega un access token ya caducado', async ({ request, qaEnvironment }) => {
        const fixtures = await applyQaScenario(request, qaEnvironment, 'expired-sessions');
        try {
            const credentials = credentialsFor('userA', fixtures);
            expect(credentials).not.toBeNull();
            const token = await loginThroughApi(request, qaEnvironment, credentials!);
            const response = await request.get(`${qaEnvironment.apiUrl}auth/user`, { headers: bearer(token) });
            expect(response.status()).toBe(401);
            expect(await errorCode(response)).toBe('access_token_expired');
        } finally {
            await applyQaScenario(request, qaEnvironment, 'baseline');
        }
    });

    test('rate-limited devuelve el 429 observable para member-a', async ({ request, qaEnvironment }) => {
        const fixtures = await applyQaScenario(request, qaEnvironment, 'rate-limited');
        try {
            const credentials = credentialsFor('userA', fixtures);
            expect(credentials).not.toBeNull();
            const token = await loginThroughApi(request, qaEnvironment, credentials!);
            const response = await request.get(`${qaEnvironment.apiUrl}comunidad/resumen`, { headers: bearer(token) });
            expect(response.status()).toBe(429);
            expect(await errorCode(response)).toBe('too_many_requests');
        } finally {
            await applyQaScenario(request, qaEnvironment, 'baseline');
        }
    });

    test('version-conflict rechaza reutilizar una versión de voto obsoleta', async ({ request, qaEnvironment }) => {
        const fixtures = await applyQaScenario(request, qaEnvironment, 'version-conflict');
        try {
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
        } finally {
            await applyQaScenario(request, qaEnvironment, 'baseline');
        }
    });

    test('realtime-recovery deduplica, reconecta y reconcilia por REST en el navegador', async ({ page, request, qaEnvironment }) => {
        const fixtures = await applyQaScenario(request, qaEnvironment, 'realtime-recovery');
        try {
            expect(fixture(fixtures, 'chat.primary').Metadata['Delivery']).toBe('duplicate-and-reordered');
            const userA = credentialsFor('userA', fixtures);
            const userB = credentialsFor('userB', fixtures);
            expect(userA).not.toBeNull();
            expect(userB).not.toBeNull();
            const token = await loginThroughApi(request, qaEnvironment, userB!);
            const conversationId = fixture(fixtures, 'chat.primary').Id;
            await installRealtimeProbe(page);
            await page.context().clearCookies();
            await page.goto('/login');
            await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
            await loginThroughUi(page, userA!);
            await waitForRealtimeObservation(page, { kind: 'connection', channel: 'chat', status: 'connected' });

            const historyUrl = `${qaEnvironment.apiUrl}chat/conversaciones/${conversationId}/mensajes`;
            const initialHistory = page.waitForResponse(response => response.url().startsWith(historyUrl) && response.request().method() === 'GET' && response.ok());
            await page.goto(`/dashboard/community/messages/${conversationId}`);
            await initialHistory;
            const observationStart = (await realtimeObservations(page)).length;
            const markers = Array.from({ length: 4 }, (_, index) => `qa-recovery-${Date.now()}-${index}`);
            const sent = await Promise.all(markers.map(marker => request.post(historyUrl, {
                headers: bearer(token),
                data: { CuerpoMarkdown: marker, ClientMessageId: crypto.randomUUID() }
            })));
            expect(sent.every(response => response.status() === 201)).toBeTruthy();

            await expect.poll(async () => {
                const observations = (await realtimeObservations(page)).slice(observationStart);
                const appliedIds = [...new Set(observations
                    .filter(item => item.kind === 'event-applied' && item.eventType === 'message.created' && item.conversationId === conversationId)
                    .map(item => item.eventId!))];
                return appliedIds.filter(eventId => {
                    const sameEvent = observations.filter(item => item.eventId === eventId);
                    return sameEvent.filter(item => item.kind === 'frame-received').length >= 2
                        && sameEvent.filter(item => item.kind === 'event-applied').length === 1
                        && sameEvent.some(item => item.kind === 'event-duplicate');
                }).length;
            }, { timeout: 30_000, message: 'El navegador debe observar duplicados y aplicar cada eventId una sola vez.' }).toBeGreaterThanOrEqual(markers.length);

            const delivered = (await realtimeObservations(page)).slice(observationStart)
                .filter(item => item.kind === 'event-applied' && item.eventType === 'message.created' && item.conversationId === conversationId);
            const eventIds = [...new Set(delivered.map(item => item.eventId!))];
            const numericIds = eventIds.map(Number).filter(Number.isFinite);
            expect(numericIds.length).toBeGreaterThanOrEqual(markers.length);
            expect(numericIds.some((eventId, index) => index > 0 && eventId < numericIds[index - 1]), 'El perfil debe entregar al menos un par de eventos fuera de orden.').toBeTruthy();
            for (const marker of markers)
                await expect(page.getByText(marker, { exact: true })).toHaveCount(1);

            const disconnectStart = (await realtimeObservations(page)).length;
            await forceRealtimeDisconnect(page, 'chat');
            await waitForRealtimeObservation(page, { kind: 'connection', channel: 'chat', status: 'closed' }, disconnectStart);
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
        } finally {
            await applyQaScenario(request, qaEnvironment, 'baseline');
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
