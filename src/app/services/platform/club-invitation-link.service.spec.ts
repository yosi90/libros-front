import { HttpErrorResponse } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { DecisionNotice } from '../../interfaces/session-notification';
import { IdentityChange, LibraryAccessState } from '../auth/platform-session.service';
import { DecisionNoticeService } from '../navigation/decision-notice.service';
import { ClubInvitationLinkService, INVITATIONS_URL, parseInvitationFragment } from './club-invitation-link.service';

describe('ClubInvitationLinkService (#yosi-invitacion y #yosi-invitaciones)', () => {
    const invitation = { id: 5, espacio: { id: 7, idExterno: 'club-70', nombre: 'Club de Dune', dosPasos: false }, de: { cuenta: 'b', nombre: 'Ana' }, rol: 'miembro', nombreRol: 'Miembro', miembros: 4, caduca: '2026-11-08T00:00:00Z' };
    let services: ClubInvitationLinkService[] = [];

    function create(fragment: string, logged = true) {
        history.replaceState(history.state, '', `${location.pathname}${location.search}${fragment}`);
        const access = new BehaviorSubject<LibraryAccessState>(logged ? 'lista' : 'sin_sesion');
        const userIsLogged$ = new BehaviorSubject(logged);
        const session = {
            get access() { return access.value; },
            access$: access.asObservable(),
            get userIsLogged() { return userIsLogged$.value; },
            userIsLogged$,
            identityChange$: new Subject<IdentityChange>(),
            entrar: jasmine.createSpy('entrar').and.resolveTo(true),
            cambiarCuenta: jasmine.createSpy('cambiarCuenta').and.resolveTo(true),
            socialUrl: (vista: string) => `https://social.test/?vista=${vista}`
        };
        const router = {
            events: new Subject<unknown>(),
            url: '/home',
            parseUrl: (url: string) => ({ fragment: url.includes('#') ? url.slice(url.indexOf('#') + 1) : null }),
            serializeUrl: () => '/home',
            navigate: jasmine.createSpy('navigate').and.resolveTo(true),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true)
        };
        const spaces = jasmine.createSpyObj('PlatformSpacesService', ['invitationByCode', 'acceptByCode', 'reject', 'markEntered']);
        spaces.invitationByCode.and.returnValue(of(invitation));
        spaces.acceptByCode.and.returnValue(of({ id: 7, idExterno: 'club-70', nombre: 'Club de Dune' }));
        spaces.reject.and.returnValue(of(null));
        const decisions = new DecisionNoticeService();
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem']);
        const location$ = jasmine.createSpyObj('Location', ['replaceState']);
        const zone = { run: (fn: () => void) => fn() } as unknown as NgZone;
        const service = new ClubInvitationLinkService(router as never, location$, session as never, spaces, decisions, toasts, zone);
        services.push(service);
        let notice: DecisionNotice | null = null;
        decisions.notice$.subscribe(value => notice = value);
        return { service, session, router, spaces, decisions, access, userIsLogged$, current: () => notice };
    }

    function run(decisions: DecisionNoticeService, notice: DecisionNotice | null, label: string): void {
        const action = notice?.actions.find(item => item.label === label);
        if (!action) throw new Error(`Sin la acción «${label}»`);
        void decisions.run(action);
    }

    afterEach(() => {
        services.forEach(service => service.ngOnDestroy());
        services = [];
        history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    });

    it('lee los dos fragmentos como el SDK', () => {
        expect(parseInvitationFragment('#yosi-invitacion=ABC%2B1')).toEqual({ tipo: 'codigo', codigo: 'ABC+1' });
        expect(parseInvitationFragment('yosi-invitacion=XYZ')).toEqual({ tipo: 'codigo', codigo: 'XYZ' });
        expect(parseInvitationFragment('#yosi-invitaciones')).toEqual({ tipo: 'lista' });
        expect(parseInvitationFragment('#otra')).toBeNull();
    });

    it('con un código, lo quita de la dirección, enseña la invitación y al aceptarla abre el club', fakeAsync(() => {
        const { service, spaces, router, decisions, current } = create('#yosi-invitacion=ABC');

        service.start();
        expect(location.hash).toBe('');
        flushMicrotasks();
        tick();

        expect(spaces.invitationByCode).toHaveBeenCalledOnceWith('ABC');
        expect(current()?.title).toContain('Club de Dune');
        expect(current()?.message).toContain('Ana te invita');

        run(decisions, current(), 'Aceptar');
        flushMicrotasks();
        expect(spaces.acceptByCode).toHaveBeenCalledOnceWith('ABC');
        expect(spaces.markEntered).toHaveBeenCalledOnceWith(70);
        expect(router.navigate).toHaveBeenCalledOnceWith(['/dashboard/community/clubs', 70]);
        expect(service.hasPending).toBeFalse();
    }));

    it('rechazar la invitación del enlace la rechaza en la plataforma', fakeAsync(() => {
        const { service, spaces, decisions, current } = create('#yosi-invitacion=ABC');
        service.start();
        flushMicrotasks();
        tick();

        run(decisions, current(), 'Rechazar');
        flushMicrotasks();

        expect(spaces.reject).toHaveBeenCalledOnceWith(5);
        expect(spaces.acceptByCode).not.toHaveBeenCalled();
    }));

    it('sin sesión pide entrar y, al entrar, enseña la invitación', fakeAsync(() => {
        const { service, session, spaces, decisions, current, access, userIsLogged$ } = create('#yosi-invitacion=ABC', false);
        service.start();
        flushMicrotasks();
        tick();

        expect(spaces.invitationByCode).not.toHaveBeenCalled();
        expect(current()?.title).toBe('Tienes una invitación a un club');
        run(decisions, current(), 'Entrar');
        flushMicrotasks();
        expect(session.entrar).toHaveBeenCalled();

        session.identityChange$.next({ generation: 2, accountId: 'cuenta-a' });
        access.next('lista');
        userIsLogged$.next(true);
        tick();
        expect(spaces.invitationByCode).toHaveBeenCalledOnceWith('ABC');
    }));

    it('otro correo: ofrece entrar con otra cuenta y la retoma con ella', fakeAsync(() => {
        const { service, session, spaces, decisions, current, userIsLogged$ } = create('#yosi-invitacion=ABC');
        spaces.invitationByCode.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'correo_de_otra_cuenta' } })));
        service.start();
        flushMicrotasks();
        tick();
        expect(current()?.title).toBe('La invitación es para otro correo');

        run(decisions, current(), 'Entrar con otra cuenta');
        flushMicrotasks();
        expect(session.cambiarCuenta).toHaveBeenCalled();

        spaces.invitationByCode.and.returnValue(of(invitation));
        session.identityChange$.next({ generation: 2, accountId: 'cuenta-a' });
        session.identityChange$.next({ generation: 3, accountId: 'cuenta-b' });
        userIsLogged$.next(false);
        userIsLogged$.next(true);
        tick();
        expect(spaces.invitationByCode).toHaveBeenCalledTimes(2);
        expect(current()?.title).toContain('Club de Dune');
    }));

    it('dos pasos: enlaza la seguridad de la web social y deja reintentar', fakeAsync(() => {
        const { service, spaces, decisions, current } = create('#yosi-invitacion=ABC');
        spaces.acceptByCode.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'dos_pasos_necesarios' } })));
        spyOn(window, 'open');
        service.start();
        flushMicrotasks();
        tick();
        run(decisions, current(), 'Aceptar');
        flushMicrotasks();
        tick();

        expect(current()?.title).toBe('Activa la verificación en dos pasos');
        run(decisions, current(), 'Activarla');
        flushMicrotasks();
        expect(window.open).toHaveBeenCalledWith('https://social.test/?vista=seguridad', '_blank', 'noopener');
        expect(service.hasPending).toBeTrue();
    }));

    it('invitación caducada, retirada o usada: lo explica y lleva a las pendientes', fakeAsync(() => {
        const { service, spaces, router, decisions, current } = create('#yosi-invitacion=ABC');
        spaces.invitationByCode.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { code: 'invitacion_no_encontrada' } })));
        service.start();
        flushMicrotasks();
        tick();

        expect(current()?.title).toBe('Esta invitación ya no vale');
        run(decisions, current(), 'Ver mis invitaciones');
        flushMicrotasks();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith(INVITATIONS_URL);
    }));

    it('#yosi-invitaciones lleva a las invitaciones pendientes del centro de acceso', fakeAsync(() => {
        const { service, router } = create('#yosi-invitaciones');
        service.start();
        flushMicrotasks();
        tick();

        expect(location.hash).toBe('');
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith(INVITATIONS_URL);
    }));

    it('un cambio de cuenta que la persona no ha pedido olvida la invitación (CAMBIO_DE_CUENTA.md)', fakeAsync(() => {
        const { service, session, spaces, access, userIsLogged$ } = create('#yosi-invitacion=ABC', false);
        service.start();
        flushMicrotasks();
        tick();

        session.identityChange$.next({ generation: 2, accountId: 'cuenta-a' });
        session.identityChange$.next({ generation: 3, accountId: 'cuenta-b' });
        access.next('lista');
        userIsLogged$.next(true);
        tick();

        expect(service.hasPending).toBeFalse();
        expect(spaces.invitationByCode).not.toHaveBeenCalled();
    }));
});
