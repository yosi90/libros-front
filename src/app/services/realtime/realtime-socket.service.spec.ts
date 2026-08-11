import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { RealtimeSocketService } from './realtime-socket.service';

describe('RealtimeSocketService', () => {
    function createService() {
        const ticketResponse = new Subject<unknown>();
        const http = jasmine.createSpyObj('HttpClient', ['post']);
        http.post.and.returnValue(ticketResponse);
        const capabilities = {
            state$: new BehaviorSubject({}),
            isActive: () => true
        };
        const apiHealth = jasmine.createSpyObj('ApiHealthService', ['check']);
        apiHealth.check.and.returnValue(of({ state: 'online', apiAvailable: true, realtimeAvailable: true }));
        return { service: new RealtimeSocketService(http, capabilities as any, apiHealth), http, ticketResponse, apiHealth };
    }

    it('does not request concurrent tickets for the same channel', () => {
        const { service, http } = createService();

        service.open('community');
        service.open('community');

        expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('stops automatic reconnect attempts after the retry budget is exhausted', () => {
        const { service } = createService();
        const connection = (service as any).connections.community;
        connection.manuallyClosed = false;
        connection.reconnectAttempt = 5;

        (service as any).scheduleReconnect('community');

        expect((service as any).statusSubject.value.community).toBe('offline');
    });

    it('stops realtime when verify reports the API or gateway as unavailable', () => {
        const { service, http, apiHealth } = createService();
        http.post.and.returnValue(throwError(() => new Error('API caída')));
        apiHealth.check.and.returnValue(of({ state: 'offline', apiAvailable: false, realtimeAvailable: false }));

        service.open('community');

        expect(apiHealth.check).toHaveBeenCalledTimes(1);
        expect((service as any).statusSubject.value.community).toBe('offline');
    });

    it('deduplicates repeated envelopes by eventId even when delivery order changes', () => {
        const { service } = createService();
        const received: string[] = [];
        service.events$.subscribe(event => received.push(event.eventId));
        const newer = JSON.stringify({ eventId: 'event-2', occurredAtUtc: '2026-08-11T12:01:00Z', type: 'message.created', payload: {} });
        const older = JSON.stringify({ eventId: 'event-1', occurredAtUtc: '2026-08-11T12:00:00Z', type: 'message.created', payload: {} });

        (service as any).handleMessage('chat', newer);
        (service as any).handleMessage('chat', newer);
        (service as any).handleMessage('chat', older);
        (service as any).handleMessage('chat', older);

        expect(received).toEqual(['event-2', 'event-1']);
    });

    it('publishes sanitized QA observations and accepts the controlled disconnect command only in QA', () => {
        const previousEnvironmentName = environment.environmentName;
        const observations: Array<{ kind?: string; eventId?: string }> = [];
        const observationHandler = (event: Event) => observations.push((event as CustomEvent).detail);
        environment.environmentName = 'qa';
        window.addEventListener('libros:qa-realtime-observation', observationHandler);
        try {
            const { service } = createService();
            const close = jasmine.createSpy('close');
            (service as any).connections.chat.socket = { readyState: WebSocket.OPEN, close };
            window.dispatchEvent(new CustomEvent('libros:qa-realtime-command', { detail: { action: 'disconnect', channel: 'chat' } }));
            const envelope = JSON.stringify({ eventId: 'qa-event', occurredAtUtc: '2026-08-11T12:00:00Z', type: 'message.created', payload: { ConversacionId: 7 } });

            (service as any).handleMessage('chat', envelope);
            (service as any).handleMessage('chat', envelope);

            expect(close).toHaveBeenCalledOnceWith(4001, 'qa_forced_disconnect');
            expect(observations.map(item => item.kind)).toEqual(['frame-received', 'event-applied', 'frame-received', 'event-duplicate']);
            expect(observations.every(item => item.eventId === 'qa-event')).toBeTruthy();
        } finally {
            window.removeEventListener('libros:qa-realtime-observation', observationHandler);
            environment.environmentName = previousEnvironmentName;
        }
    });
});
