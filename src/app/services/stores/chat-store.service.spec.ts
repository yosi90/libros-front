import { BehaviorSubject, of, Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ChatService } from '../entities/chat.service';
import { CommunityService } from '../entities/community.service';
import { RealtimeConnectionEvent, RealtimeEvent, RealtimeSocketService } from '../realtime/realtime-socket.service';
import { ChatStoreService } from './chat-store.service';

describe('ChatStoreService', () => {
    let service: ChatStoreService;
    let conversations: jasmine.Spy;
    let events: Subject<RealtimeEvent>;

    beforeEach(() => {
        events = new Subject<RealtimeEvent>();
        const connections = new Subject<RealtimeConnectionEvent>();
        conversations = jasmine.createSpy().and.returnValue(of([
            { Id: 1, Tipo: 'directa', Titulo: null, ClubId: null, FechaUltimoMensaje: '2026-01-01T00:00:00Z', NoLeidos: 0 },
            { Id: 2, Tipo: 'club', Titulo: 'Club', ClubId: 4, FechaUltimoMensaje: '2026-02-01T00:00:00Z', NoLeidos: 2 }
        ]));
        TestBed.configureTestingModule({ providers: [
            ChatStoreService,
            { provide: ChatService, useValue: { conversations } },
            { provide: RealtimeSocketService, useValue: { events$: events.asObservable(), connections$: connections.asObservable(), open: jasmine.createSpy() } },
            { provide: CommunityService, useValue: { blockedUserIds$: new BehaviorSubject<number | null>(null) } }
        ] });
        service = TestBed.inject(ChatStoreService);
    });

    it('inicializa una vez por actor y ordena por actividad reciente', () => {
        service.initialize(7);
        service.initialize(7);

        expect(conversations).toHaveBeenCalledTimes(1);
        expect(service.snapshot.conversations.map(item => item.Id)).toEqual([2, 1]);
        expect(service.snapshot.initialized).toBeTrue();
    });

    it('reconcilia por REST ante una invalidación realtime', () => {
        service.initialize(7);
        events.next({ eventId: '1', occurredAtUtc: new Date().toISOString(), channel: 'chat', type: 'message.created', payload: { ConversacionId: 2 } });

        expect(conversations).toHaveBeenCalledTimes(2);
    });
});
