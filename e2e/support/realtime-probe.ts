import { Page } from '@playwright/test';

export type QaRealtimeObservationKind = 'connection' | 'frame-received' | 'event-applied' | 'event-duplicate';

export interface QaRealtimeObservation {
    documentId: string;
    kind: QaRealtimeObservationKind;
    channel: 'chat' | 'community';
    status?: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'closed';
    reconnected?: boolean;
    eventId?: string;
    occurredAtUtc?: string;
    eventType?: string;
    conversationId?: number | null;
    messageId?: number | null;
}

export interface QaRealtimeDocument {
    documentId: string;
    url: string;
    createdAtUtc: string;
}

export interface QaMainFrameNavigation {
    url: string;
    navigatedAtUtc: string;
}

export interface QaRealtimeProbeSnapshot {
    activeDocumentId: string | null;
    documents: QaRealtimeDocument[];
    mainFrameNavigations: QaMainFrameNavigation[];
    observations: QaRealtimeObservation[];
}

interface ProbeBindingPayload {
    type: 'document-created' | 'observation';
    documentId: string;
    url?: string;
    observation?: QaRealtimeObservation;
}

const observationEvent = 'libros:qa-realtime-observation';
const commandEvent = 'libros:qa-realtime-command';
const bindingName = '__librosQaRecordRealtime';
const trackers = new WeakMap<Page, RealtimeProbeTracker>();

export async function installRealtimeProbe(page: Page): Promise<void> {
    if (trackers.has(page)) throw new Error('La sonda realtime ya estaba instalada en esta pagina.');

    const tracker = new RealtimeProbeTracker();
    trackers.set(page, tracker);
    page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) tracker.recordNavigation(frame.url());
    });

    await page.exposeBinding(bindingName, (source, payload: ProbeBindingPayload) => {
        if (source.frame !== page.mainFrame()) return;
        tracker.recordPayload(payload);
    });

    await page.addInitScript(({ eventName, nodeBindingName }) => {
        const documentId = crypto.randomUUID();
        const observations: unknown[] = [];
        const qaWindow = window as typeof window & {
            __librosQaRealtimeDocumentId?: string;
            __librosQaRealtimeObservations?: unknown[];
            [key: string]: unknown;
        };
        const publish = qaWindow[nodeBindingName] as ((payload: unknown) => Promise<void>) | undefined;

        Object.defineProperty(window, '__librosQaRealtimeDocumentId', {
            configurable: false,
            value: documentId
        });
        Object.defineProperty(window, '__librosQaRealtimeObservations', {
            configurable: false,
            value: observations
        });
        const report = (payload: unknown) => {
            if (publish) void publish(payload).catch(() => undefined);
        };
        report({ type: 'document-created', documentId, url: location.href });

        window.addEventListener(eventName, event => {
            const detail = event instanceof CustomEvent ? event.detail : null;
            if (!detail || typeof detail !== 'object') return;
            const observation = { ...detail, documentId };
            observations.push(observation);
            if (observations.length > 500) observations.shift();
            report({ type: 'observation', documentId, observation });
        });
    }, { eventName: observationEvent, nodeBindingName: bindingName });
}

export async function realtimeObservations(page: Page): Promise<QaRealtimeObservation[]> {
    return [...trackerFor(page).observations];
}

export async function realtimeProbeSnapshot(page: Page): Promise<QaRealtimeProbeSnapshot> {
    const tracker = trackerFor(page);
    return {
        activeDocumentId: await activeDocumentId(page),
        documents: [...tracker.documents],
        mainFrameNavigations: [...tracker.navigations],
        observations: [...tracker.observations]
    };
}

export async function waitForCurrentRealtimeConnection(page: Page, channel: 'chat' | 'community', timeoutMs = 20_000): Promise<string> {
    const tracker = trackerFor(page);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const observedVersion = tracker.version;
        const documentId = await activeDocumentId(page);
        const isConnected = documentId !== null && tracker.observations.some(observation =>
            observation.documentId === documentId
            && observation.kind === 'connection'
            && observation.channel === channel
            && observation.status === 'connected');
        if (isConnected && await activeDocumentId(page) === documentId) return documentId;
        await tracker.waitForChange(observedVersion, deadline - Date.now());
    }

    throw new Error(`La conexion ${channel} no quedo lista para la generacion de documento vigente.`);
}

export async function waitForCurrentRealtimeConnectionSnapshot(page: Page, channel: 'chat' | 'community', timeoutMs = 20_000): Promise<QaRealtimeProbeSnapshot> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const documentId = await waitForCurrentRealtimeConnection(page, channel, deadline - Date.now());
        const snapshot = await realtimeProbeSnapshot(page);
        const stillReady = snapshot.activeDocumentId === documentId && snapshot.observations.some(observation =>
            observation.documentId === documentId
            && observation.kind === 'connection'
            && observation.channel === channel
            && observation.status === 'connected');
        if (stillReady) return snapshot;
    }

    throw new Error(`La generacion de documento ${channel} cambio antes de acreditar readiness.`);
}

export async function waitForRealtimeObservation(page: Page, predicate: Partial<QaRealtimeObservation>, fromIndex = 0, timeoutMs = 20_000): Promise<void> {
    const tracker = trackerFor(page);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const observedVersion = tracker.version;
        if (tracker.observations.slice(fromIndex).some(observation => matches(observation, predicate))) return;
        await tracker.waitForChange(observedVersion, deadline - Date.now());
    }

    throw new Error(`No se observo el evento realtime esperado: ${JSON.stringify(predicate)}.`);
}

export async function forceRealtimeDisconnect(page: Page, channel: 'chat' | 'community'): Promise<void> {
    await page.evaluate(({ eventName, targetChannel }) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail: { action: 'disconnect', channel: targetChannel } }));
    }, { eventName: commandEvent, targetChannel: channel });
}

export async function resumeRealtimeConnection(page: Page, channel: 'chat' | 'community'): Promise<void> {
    await page.evaluate(({ eventName, targetChannel }) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail: { action: 'resume', channel: targetChannel } }));
    }, { eventName: commandEvent, targetChannel: channel });
}

async function activeDocumentId(page: Page): Promise<string | null> {
    try {
        return await page.evaluate(() => {
            const value = (window as typeof window & { __librosQaRealtimeDocumentId?: unknown }).__librosQaRealtimeDocumentId;
            return typeof value === 'string' ? value : null;
        });
    } catch {
        return null;
    }
}

function matches(observation: QaRealtimeObservation, predicate: Partial<QaRealtimeObservation>): boolean {
    return Object.entries(predicate).every(([key, value]) => observation[key as keyof QaRealtimeObservation] === value);
}

function trackerFor(page: Page): RealtimeProbeTracker {
    const tracker = trackers.get(page);
    if (!tracker) throw new Error('La sonda realtime no esta instalada en esta pagina.');
    return tracker;
}

class RealtimeProbeTracker {
    readonly documents: QaRealtimeDocument[] = [];
    readonly navigations: QaMainFrameNavigation[] = [];
    readonly observations: QaRealtimeObservation[] = [];
    version = 0;
    private readonly listeners = new Set<() => void>();

    recordNavigation(url: string): void {
        this.navigations.push({ url, navigatedAtUtc: new Date().toISOString() });
        this.changed();
    }

    recordPayload(payload: ProbeBindingPayload): void {
        if (!payload || typeof payload.documentId !== 'string') return;
        if (payload.type === 'document-created') {
            this.documents.push({
                documentId: payload.documentId,
                url: typeof payload.url === 'string' ? payload.url : '',
                createdAtUtc: new Date().toISOString()
            });
        } else if (payload.type === 'observation'
            && payload.observation
            && payload.observation.documentId === payload.documentId) {
            this.observations.push(payload.observation);
        } else {
            return;
        }
        this.changed();
    }

    async waitForChange(observedVersion: number, timeoutMs: number): Promise<void> {
        if (this.version !== observedVersion) return;
        if (timeoutMs <= 0) return;

        await new Promise<void>(resolve => {
            let timer: ReturnType<typeof setTimeout>;
            const listener = () => {
                clearTimeout(timer);
                this.listeners.delete(listener);
                resolve();
            };
            timer = setTimeout(listener, timeoutMs);
            this.listeners.add(listener);
            if (this.version !== observedVersion) listener();
        });
    }

    private changed(): void {
        this.version++;
        for (const listener of [...this.listeners]) listener();
    }
}
