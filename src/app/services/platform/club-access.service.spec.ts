import { Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { EspacioPlataforma } from '../../interfaces/platform-spaces';
import { ClubAccessService } from './club-access.service';

describe('ClubAccessService', () => {
    const space = (id: number, extra: Partial<EspacioPlataforma> = {}): EspacioPlataforma => ({
        id, idExterno: `club-${id * 10}`, nombre: `Club ${id}`, entrada: 'solicitud', dosPasos: false, propietario: 'a', miembros: 3, conversacion: null,
        yo: { rol: 'moderacion', nombreRol: 'Moderación', propietario: false, estado: 'activo', capacidades: { gestionar: true, invitar: true, chat: 'escribir' } },
        ...extra
    });

    function create() {
        const session = { generation: 1, isCurrentGeneration(value: number) { return value === session.generation; } };
        const spaces = jasmine.createSpyObj('PlatformSpacesService', ['myInvitations', 'mine', 'sentInvitations', 'joinRequests', 'ownRequestsSent']);
        spaces.myInvitations.and.returnValue(of([
            { id: 1, espacio: { id: 7, idExterno: 'club-70', nombre: 'Club 7', dosPasos: true }, de: { cuenta: 'b', nombre: 'Ana' }, rol: 'miembro', nombreRol: 'Miembro', caduca: '2026-11-08T00:00:00Z' },
            // Un espacio que no es de un club no sale.
            { id: 2, espacio: { id: 8, idExterno: 'otra-cosa', nombre: 'X', dosPasos: false }, de: { cuenta: 'b', nombre: 'Ana' }, rol: null, caduca: '2026-11-08T00:00:00Z' }
        ]));
        spaces.mine.and.returnValue(of([space(1), space(2, { entrada: 'abierto' }), space(3, { yo: { ...space(3).yo!, capacidades: { gestionar: false, invitar: false, chat: 'escribir' } } })]));
        spaces.sentInvitations.and.callFake((id: number) => of(id === 1 ? [{ id: 11, cuenta: 'c', alias: 'carla', correo: null, rol: 'miembro', de: 'a', creada: '', caduca: '' }] : []));
        spaces.joinRequests.and.returnValue(of([{ id: 21, cuenta: 'd', alias: 'dani', nombre: 'Dani', mensaje: 'Hola', creada: '' }]));
        spaces.ownRequestsSent.and.returnValue([{ espacioId: 5, clubId: 50, nombre: 'Club 5', creada: '', mensaje: null }]);
        const service = new ClubAccessService(spaces, session as never);
        return { service, spaces, session };
    }

    it('compone las bandejas con los espacios: recibidas, enviadas de donde se puede invitar y solicitudes', async () => {
        const { service, spaces } = create();

        const inbox = await firstValueFrom(service.refresh());

        expect(inbox.invitationsReceived.map(item => item.club)).toEqual([{ EspacioId: 7, Id: 70, Nombre: 'Club 7', DosPasos: true }]);
        expect(inbox.invitationsSent.map(item => item.invitation.id)).toEqual([11]);
        // Solo los espacios con solicitud tienen solicitudes; y solo donde se puede invitar.
        expect(spaces.joinRequests).toHaveBeenCalledOnceWith(1);
        expect(spaces.sentInvitations).toHaveBeenCalledTimes(2);
        expect(inbox.requestsReceived.map(item => item.request.id)).toEqual([21]);
        expect(inbox.requestsSent.map(item => item.club.Id)).toEqual([50]);
        expect(inbox.partial).toBeFalse();
        expect(await firstValueFrom(service.counters$)).toEqual({ Solicitudes: { EnviadasPendientes: 1, RecibidasPendientes: 1 }, Invitaciones: { EnviadasPendientes: 1, RecibidasPendientes: 1 } });
    });

    it('si un club no responde, enseña lo demás y avisa de que puede faltar algo', async () => {
        const { service, spaces } = create();
        spaces.joinRequests.and.returnValue(throwError(() => ({ status: 503 })));

        const inbox = await firstValueFrom(service.refresh());

        expect(inbox.partial).toBeTrue();
        expect(inbox.invitationsSent.length).toBe(1);
    });

    it('descarta la bandeja que llega con otra cuenta y se vacía al cambiarla', async () => {
        const { service, session, spaces } = create();
        const late = new Subject<unknown[]>();
        const invitations = spaces.myInvitations();
        spaces.myInvitations.and.returnValue(late);
        const pending = firstValueFrom(service.refresh());
        session.generation = 2;
        (invitations as Observable<unknown[]>).subscribe(value => { late.next(value); late.complete(); });
        await pending;
        expect(service.inbox.invitationsReceived.length).toBe(0);

        session.generation = 1;
        spaces.myInvitations.and.returnValue(invitations);
        await firstValueFrom(service.refresh());
        expect(service.inbox.invitationsReceived.length).toBe(1);
        service.clear();
        expect(service.inbox.invitationsReceived.length).toBe(0);
    });

    it('quita una fila resuelta sin esperar a la siguiente lectura', async () => {
        const { service } = create();
        await firstValueFrom(service.refresh());

        service.remove('invitationsReceived', item => item.invitation.id === 1);

        expect(service.inbox.invitationsReceived.length).toBe(0);
    });
});
