import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ClubAccessInbox } from '../../../../../services/platform/club-access.service';
import { ClubAccessCenterComponent } from './club-access-center.component';

describe('ClubAccessCenterComponent (espacios de la plataforma)', () => {
    const club = { EspacioId: 7, Id: 70, Nombre: 'Club de Dune', DosPasos: false };
    const inbox = (): ClubAccessInbox => ({
        invitationsReceived: [{ club, invitation: { id: 1, espacio: { id: 7, idExterno: 'club-70', nombre: 'Club de Dune', dosPasos: false }, de: { cuenta: 'b', nombre: 'Ana' }, rol: 'miembro', nombreRol: 'Miembro', caduca: '2026-11-08T00:00:00Z' } }],
        invitationsSent: [{ club, invitation: { id: 11, cuenta: null, alias: null, correo: 'a***@ejemplo.es', rol: 'miembro', de: 'a', creada: '2026-10-24T10:00:00Z', caduca: '2026-11-07T10:00:00Z' } }],
        requestsReceived: [{ club, request: { id: 21, cuenta: 'd', alias: 'dani', nombre: 'Dani', mensaje: 'Hola', creada: '2026-10-24T10:00:00Z' } }],
        requestsSent: [{ club: { EspacioId: 8, Id: 80, Nombre: 'Club cerrado' }, creada: '2026-10-24T10:00:00Z', mensaje: null }],
        partial: false
    });

    function create(query: Record<string, string> = {}) {
        const state = new BehaviorSubject<ClubAccessInbox>(inbox());
        const clubAccess = {
            inbox$: state.asObservable(),
            counters$: of({ Solicitudes: { EnviadasPendientes: 1, RecibidasPendientes: 1 }, Invitaciones: { EnviadasPendientes: 1, RecibidasPendientes: 1 } }),
            refresh: jasmine.createSpy('refresh').and.callFake(() => of(state.value)),
            remove: jasmine.createSpy('remove')
        };
        const spaces = jasmine.createSpyObj('PlatformSpacesService', ['accept', 'reject', 'resolveJoinRequest', 'withdrawInvitation', 'withdrawRequest', 'markEntered']);
        for (const method of ['accept', 'reject', 'resolveJoinRequest', 'withdrawInvitation', 'withdrawRequest']) spaces[method].and.returnValue(of({ id: 7, idExterno: 'club-70' }));
        const session = { cambiarCuenta: jasmine.createSpy('cambiarCuenta').and.resolveTo(true), socialUrl: (vista: string) => `https://social.test/?vista=${vista}` };
        const route = { snapshot: { queryParamMap: { get: (key: string) => query[key] ?? null } } };
        const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
        const component = new ClubAccessCenterComponent(clubAccess as never, spaces, session as never, route as never, router as never, { snapshot: {} } as never);
        component.ngOnInit();
        return { component, clubAccess, spaces, session, router };
    }

    it('abre las invitaciones recibidas (las del enlace de la campana) y sincroniza la dirección', () => {
        const { component, clubAccess, router } = create();

        expect(clubAccess.refresh).toHaveBeenCalledTimes(1);
        expect(component.kind).toBe('invitaciones');
        expect(component.direction).toBe('recibidas');
        expect(component.rows.map(row => row.Persona)).toEqual(['Ana']);
        expect(component.personLabel(component.rows[0])).toBe('Te invita Ana');
        expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: jasmine.objectContaining({ accessType: 'invitaciones', direction: 'recibidas' }) }));
    });

    it('acepta una invitación recibida en la plataforma y recuerda la entrada para esperar al feed', () => {
        const { component, spaces, clubAccess } = create();

        component.accept(component.rows[0]);

        expect(spaces.accept).toHaveBeenCalledOnceWith(1);
        expect(spaces.markEntered).toHaveBeenCalledOnceWith(70);
        expect(component.joinedClub?.Id).toBe(70);
        expect(clubAccess.remove).toHaveBeenCalledWith('invitationsReceived', jasmine.any(Function));
    });

    it('rechaza una invitación, retira una enviada y aprueba o rechaza las solicitudes', () => {
        const { component, spaces } = create();

        component.reject(component.rows[0]);
        expect(spaces.reject).toHaveBeenCalledOnceWith(1);

        component.selectDirection('enviadas');
        component.cancel(component.rows[0]);
        expect(spaces.withdrawInvitation).toHaveBeenCalledOnceWith(7, 11);

        component.selectKind('solicitudes');
        component.selectDirection('recibidas');
        expect(component.acceptLabel()).toBe('Aprobar');
        component.accept(component.rows[0]);
        component.reject(component.rows[0]);
        expect(spaces.resolveJoinRequest.calls.allArgs()).toEqual([[7, 21, 'aprobar'], [7, 21, 'rechazar']]);
    });

    it('retira la solicitud propia, que solo existe en esta carga de la página', () => {
        const { component, spaces } = create({ accessType: 'solicitudes', direction: 'enviadas' });

        expect(component.rows[0].Club.Nombre).toBe('Club cerrado');
        expect(component.emptyMessage).toContain('campana de Yosiftware');
        component.cancel(component.rows[0]);

        expect(spaces.withdrawRequest).toHaveBeenCalledOnceWith(8);
    });

    it('otro correo: ofrece entrar con la cuenta que lo tiene, sin recargar la bandeja', () => {
        const { component, spaces, clubAccess, session } = create();
        spaces.accept.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'correo_de_otra_cuenta', error: 'Es para otro correo.' } })));

        component.accept(component.rows[0]);

        expect(component.errorAction).toBe('cambiar_cuenta');
        expect(component.error).toContain('Entra con la cuenta');
        expect(clubAccess.refresh).toHaveBeenCalledTimes(1);
        component.switchAccount();
        expect(session.cambiarCuenta).toHaveBeenCalled();
    });

    it('dos pasos: enlaza la seguridad de la web social', () => {
        const { component, spaces } = create();
        spaces.accept.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'dos_pasos_necesarios' } })));

        component.accept(component.rows[0]);

        expect(component.errorAction).toBe('dos_pasos');
        expect(component.securityUrl).toBe('https://social.test/?vista=seguridad');
    });

    it('invitación caducada o ya usada: lo dice y recarga la bandeja', () => {
        const { component, spaces, clubAccess } = create();
        spaces.accept.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { code: 'invitacion_no_encontrada' } })));

        component.accept(component.rows[0]);

        expect(component.error).toContain('caducó');
        expect(clubAccess.refresh).toHaveBeenCalledTimes(2);
    });
});
