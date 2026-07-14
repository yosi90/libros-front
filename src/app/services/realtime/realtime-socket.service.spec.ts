import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
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
});
