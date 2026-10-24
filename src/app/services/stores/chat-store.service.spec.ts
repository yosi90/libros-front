import { fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ChatConversation } from '../../interfaces/chat';
import { EventoTiempoReal } from '../auth/yosiftware-sdk';
import { ChatStoreService } from './chat-store.service';

describe('ChatStoreService', () => {
    const conversation = (Id: number, FechaUltimoMensaje: string, NoLeidos: number): ChatConversation => ({
        Id, Tipo: 'directa', Titulo: null, Web: null, FechaUltimoMensaje, NoLeidos, PuedeEnviar: true, RolParticipante: 'miembro', Cerrada: false,
        Miembros: 2, Contraparte: null, UltimoMensaje: null, Permisos: { Escribir: true, Invitar: false, Administrar: false, Salir: true }
    });
    let conversations: jasmine.Spy;
    let events: Subject<EventoTiempoReal>;
    let reconnected: Subject<void>;
    let realtime: { start: jasmine.Spy; events$: Subject<EventoTiempoReal>; reconnected$: Subject<void> };
    let session: { cuenta: { id: string } | null; userIsLogged: boolean };
    let service: ChatStoreService;

    beforeEach(() => {
        events = new Subject<EventoTiempoReal>();
        reconnected = new Subject<void>();
        conversations = jasmine.createSpy('conversations').and.returnValue(of([
            conversation(1, '2026-01-01T00:00:00Z', 0),
            conversation(2, '2026-02-01T00:00:00Z', 2)
        ]));
        realtime = { start: jasmine.createSpy('start'), events$: events, reconnected$: reconnected };
        session = { cuenta: { id: 'cuenta-a' }, userIsLogged: true };
        service = new ChatStoreService({ conversations } as never, realtime as never, session as never);
    });

    afterEach(() => service.clear());

    it('carga la bandeja de la plataforma una vez por cuenta y la ordena por actividad', () => {
        service.initialize();
        service.initialize();

        expect(conversations).toHaveBeenCalledTimes(1);
        expect(realtime.start).toHaveBeenCalled();
        expect(service.snapshot.accountId).toBe('cuenta-a');
        expect(service.snapshot.conversations.map(item => item.Id)).toEqual([2, 1]);
        expect(service.unreadTotal).toBe(2);
    });

    it('relee una sola vez ante una ráfaga de eventos del chat y al recuperar la conexión', fakeAsync(() => {
        service.initialize();
        events.next({ secuencia: 1, tipo: 'chat.mensaje', datos: { conversacion: 2 }, fecha: '' });
        events.next({ secuencia: 2, tipo: 'chat.leido', datos: { conversacion: 2 }, fecha: '' });
        events.next({ secuencia: 3, tipo: 'perfil.cambiado', datos: null, fecha: '' });
        tick(250);
        expect(conversations).toHaveBeenCalledTimes(2);

        reconnected.next();
        expect(conversations).toHaveBeenCalledTimes(3);
    }));

    it('sin cuenta no carga nada y al vaciarse deja de escuchar', fakeAsync(() => {
        session.cuenta = null;
        service.initialize();
        expect(conversations).not.toHaveBeenCalled();

        session.cuenta = { id: 'cuenta-b' };
        service.initialize();
        service.clear();
        events.next({ secuencia: 1, tipo: 'chat.mensaje', datos: null, fecha: '' });
        tick(300);
        expect(conversations).toHaveBeenCalledTimes(1);
        expect(service.snapshot.conversations).toEqual([]);
    }));

    it('pone a cero los no leídos de una conversación al leerla', () => {
        service.initialize();
        expect(service.setUnreadCount(2, 0)).toBeTrue();
        expect(service.unreadTotal).toBe(0);
        expect(service.setUnreadCount(99, 0)).toBeFalse();
    });
});
