import { Page } from '@playwright/test';

export type QaRealtimeObservationKind = 'connection' | 'frame-received' | 'event-applied' | 'event-duplicate';

export interface QaRealtimeObservation {
    kind: QaRealtimeObservationKind;
    channel: 'chat' | 'community';
    status?: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'closed';
    reconnected?: boolean;
    eventId?: string;
    occurredAtUtc?: string;
    eventType?: string;
    conversationId?: number | null;
}

const observationEvent = 'libros:qa-realtime-observation';
const commandEvent = 'libros:qa-realtime-command';

export async function installRealtimeProbe(page: Page): Promise<void> {
    await page.addInitScript(eventName => {
        const observations: unknown[] = [];
        Object.defineProperty(window, '__librosQaRealtimeObservations', {
            configurable: false,
            value: observations
        });
        window.addEventListener(eventName, event => {
            const detail = event instanceof CustomEvent ? event.detail : null;
            if (!detail || typeof detail !== 'object') return;
            observations.push(detail);
            if (observations.length > 500) observations.shift();
        });
    }, observationEvent);
}

export async function realtimeObservations(page: Page): Promise<QaRealtimeObservation[]> {
    return page.evaluate(() => {
        const value = (window as typeof window & { __librosQaRealtimeObservations?: QaRealtimeObservation[] }).__librosQaRealtimeObservations;
        return Array.isArray(value) ? value : [];
    });
}

export async function waitForRealtimeObservation(page: Page, predicate: Partial<QaRealtimeObservation>, fromIndex = 0, timeoutMs = 20_000): Promise<void> {
    await page.waitForFunction(({ expected, start }) => {
        const observations = (window as typeof window & { __librosQaRealtimeObservations?: QaRealtimeObservation[] }).__librosQaRealtimeObservations || [];
        return observations.slice(start).some(observation => Object.entries(expected).every(([key, value]) => observation[key as keyof QaRealtimeObservation] === value));
    }, { expected: predicate, start: fromIndex }, { timeout: timeoutMs });
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
