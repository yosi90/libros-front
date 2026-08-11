import { expect, integrationTest as test, applyQaScenario } from './fixtures/integration';
import { credentialsFor, loginThroughApi } from './support/auth';
import { fixture } from './support/qa-reset';

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

    test('realtime-recovery persiste una sola escritura y permite reconciliar por REST', async ({ request, qaEnvironment }) => {
        const fixtures = await applyQaScenario(request, qaEnvironment, 'realtime-recovery');
        try {
            expect(fixture(fixtures, 'chat.primary').Metadata['Delivery']).toBe('duplicate-and-reordered');
            const credentials = credentialsFor('userA', fixtures);
            expect(credentials).not.toBeNull();
            const token = await loginThroughApi(request, qaEnvironment, credentials!);
            const conversationId = fixture(fixtures, 'chat.primary').Id;
            const marker = `qa-recovery-${Date.now()}`;
            const sent = await request.post(`${qaEnvironment.apiUrl}chat/conversaciones/${conversationId}/mensajes`, {
                headers: bearer(token),
                data: { CuerpoMarkdown: marker, ClientMessageId: crypto.randomUUID() }
            });
            expect(sent.status()).toBe(201);
            const history = await request.get(`${qaEnvironment.apiUrl}chat/conversaciones/${conversationId}/mensajes`, { headers: bearer(token) });
            expect(history.ok()).toBeTruthy();
            const body = await history.json() as { Mensajes?: Array<{ CuerpoMarkdown?: string }> };
            expect(body.Mensajes?.filter(message => message.CuerpoMarkdown === marker)).toHaveLength(1);
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
