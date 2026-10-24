import { of } from 'rxjs';
import { PlataformaMensaje } from '../../interfaces/platform-chat';
import { PlatformChatService } from './platform-chat.service';

describe('PlatformChatService', () => {
    const mensaje: PlataformaMensaje = {
        id: 31, conversacion: 4, tipo: 'texto', persona: { id: 'cuenta-yo', alias: 'yo', nombre: 'Yo', avatar: null }, texto: 'Hola', aviso: null,
        respuesta: null, reacciones: { total: {}, mia: null }, editado: null, borrado: false, noDisponible: false, propio: true, idCliente: 'c-1',
        creado: new Date().toISOString()
    };
    let api: { get: jasmine.Spy; post: jasmine.Spy; put: jasmine.Spy; patch: jasmine.Spy; delete: jasmine.Spy };
    let service: PlatformChatService;

    beforeEach(() => {
        api = {
            get: jasmine.createSpy('get').and.returnValue(of({})),
            post: jasmine.createSpy('post').and.returnValue(of(mensaje)),
            put: jasmine.createSpy('put').and.returnValue(of(null)),
            patch: jasmine.createSpy('patch').and.returnValue(of(mensaje)),
            delete: jasmine.createSpy('delete').and.returnValue(of(null))
        };
        const access = { gate: (_scope: string, _policy: boolean, request: unknown) => request };
        service = new PlatformChatService(api as never, { cuenta: { id: 'cuenta-yo' } } as never, access as never);
    });

    it('lee la bandeja y los mensajes de /v1/chat con el cursor de la plataforma', () => {
        api.get.and.returnValues(
            of({ conversaciones: [{ id: 4, tipo: 'grupo', titulo: 'Lectores', persona: null, web: null, miembros: 3, rol: 'admin', noLeidos: 1, ultimoMensaje: null, actividad: '2026-10-24T10:00:00Z', cerrada: false, permisos: { escribir: true, invitar: true, administrar: true, salir: true, borrar: false } }] }),
            of({ mensajes: [mensaje], cursor: 30 })
        );
        let titles: string[] = [];
        service.conversations().subscribe(items => titles = items.map(item => item.Titulo ?? ''));
        let cursor: unknown;
        service.messages(4, true, 77).subscribe(page => cursor = page.SiguienteCursor);

        expect(api.get.calls.argsFor(0)).toEqual(['/v1/chat/conversaciones']);
        expect(api.get.calls.argsFor(1)).toEqual(['/v1/chat/conversaciones/4/mensajes', { limite: 50, antes: 77 }]);
        expect(titles).toEqual(['Lectores']);
        expect(cursor).toBe(30);
    });

    it('envía texto plano con idCliente y la respuesta, y marca leído hasta un mensaje', () => {
        let sent: unknown;
        service.sendMessage(4, 'Hola', 'c-1', 12).subscribe(message => sent = message);
        service.markRead(4, 31).subscribe();

        expect(api.post.calls.argsFor(0)).toEqual(['/v1/chat/conversaciones/4/mensajes', { texto: 'Hola', idCliente: 'c-1', idRespuesta: 12 }]);
        expect(sent).toEqual(jasmine.objectContaining({ Id: 31, Propio: true, Texto: 'Hola' }));
        expect(api.post.calls.argsFor(1)).toEqual(['/v1/chat/conversaciones/4/leido', { hasta: 31 }]);
    });

    it('pone una reacción con su emoji y la quita con DELETE', () => {
        service.react(4, 31, '❤️').subscribe();
        service.react(4, 31, null).subscribe();

        expect(api.put).toHaveBeenCalledOnceWith('/v1/chat/conversaciones/4/mensajes/31/reaccion', { emoji: '❤️' });
        expect(api.delete).toHaveBeenCalledOnceWith('/v1/chat/conversaciones/4/mensajes/31/reaccion');
    });

    it('abre directas por la cuenta de la amistad y crea grupos con invitación', () => {
        api.post.and.returnValues(of({ id: 8 }), of({ id: 9 }));
        let direct = 0;
        let group = 0;
        service.createDirectConversation('cuenta-ana').subscribe(id => direct = id);
        service.createGroup('Lectores', ['cuenta-ana', 'cuenta-bea']).subscribe(id => group = id);

        expect(api.post.calls.argsFor(0)).toEqual(['/v1/chat/conversaciones/directa', { idCuenta: 'cuenta-ana' }]);
        expect(api.post.calls.argsFor(1)).toEqual(['/v1/chat/grupos', { titulo: 'Lectores', invitadas: ['cuenta-ana', 'cuenta-bea'], historial: 'desde_ingreso' }]);
        expect([direct, group]).toEqual([8, 9]);
    });

    it('administra un grupo con las rutas de participantes de la plataforma', () => {
        service.renameGroup(4, 'Nuevo').subscribe();
        service.inviteGroupParticipants(4, ['cuenta-ana']).subscribe();
        service.changeGroupParticipantRole(4, 'cuenta-ana', 'admin').subscribe();
        service.removeGroupParticipant(4, 'cuenta-ana').subscribe();
        service.leaveConversation(4).subscribe();

        expect(api.patch).toHaveBeenCalledWith('/v1/chat/conversaciones/4', { titulo: 'Nuevo' });
        expect(api.post).toHaveBeenCalledWith('/v1/chat/conversaciones/4/invitaciones', { cuentas: ['cuenta-ana'] });
        expect(api.put).toHaveBeenCalledWith('/v1/chat/conversaciones/4/participantes/cuenta-ana/rol', { rol: 'admin' });
        expect(api.delete).toHaveBeenCalledWith('/v1/chat/conversaciones/4/participantes/cuenta-ana');
        expect(api.delete).toHaveBeenCalledWith('/v1/chat/conversaciones/4');
    });

    it('trae las amistades de la plataforma ordenadas y sin cuentas borradas', () => {
        api.get.and.returnValue(of({ vinculos: [
            { persona: { id: 'cuenta-zoe', alias: 'zoe', nombre: 'Zoe', avatar: null } },
            { persona: { id: 'cuenta-x', alias: 'cuenta-borrada', nombre: null, avatar: null, borrada: true } },
            { persona: { id: 'cuenta-ana', alias: 'ana', nombre: null, avatar: null } }
        ], cursor: null }));
        let names: string[] = [];
        service.friendships().subscribe(items => names = items.map(item => item.Usuario.Nombre));

        expect(api.get).toHaveBeenCalledOnceWith('/v1/social/amistades', { limite: 100 });
        expect(names).toEqual(['ana', 'Zoe']);
    });
});
