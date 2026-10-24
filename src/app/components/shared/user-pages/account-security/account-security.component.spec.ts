import { of } from 'rxjs';
import { AccountSecurityComponent } from './account-security.component';

describe('AccountSecurityComponent', () => {
    function createComponent(mobile = false) {
        const session = {
            cuenta: { id: 'cuenta-a', alias: 'lectora', correo: 'lectora@example.test' },
            userName: 'Lectora',
            socialUrl: jasmine.createSpy('socialUrl').and.callFake((vista?: string) => `https://qa-social.yosiftware.es/?vista=${vista}`),
            editarPerfil: jasmine.createSpy('editarPerfil').and.resolveTo(true),
            cambiarCuenta: jasmine.createSpy('cambiarCuenta').and.resolveTo(true),
            salir: jasmine.createSpy('salir').and.resolveTo()
        };
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar', 'openApiError']);
        const presentation = { snapshot: { isMobilePresentationActive: mobile } };
        const community = jasmine.createSpyObj('CommunityService', ['relationships', 'unblockUser']);
        community.relationships.and.returnValue(of({ Relaciones: [], SiguienteAfterId: null }));
        const component = new AccountSecurityComponent(
            session as never,
            snackBar,
            presentation as never,
            {} as never,
            {} as never,
            { snapshot: { queryParamMap: { get: () => null } } } as never,
            community
        );
        return { component, session, snackBar };
    }

    it('enseña la cuenta de Yosiftware y enlaza su gestión en la web social', () => {
        const { component, session } = createComponent();

        expect(component.woodSection).toBe('account');
        expect(component.accountAlias).toBe('lectora');
        expect(component.accountEmail).toBe('lectora@example.test');
        expect(component.socialAccountUrl).toBe('https://qa-social.yosiftware.es/?vista=cuenta');
        expect(session.socialUrl).toHaveBeenCalledWith('cuenta');
    });

    it('cambia de cuenta, edita el perfil y sale con el SDK, sin formularios propios', () => {
        const { component, session } = createComponent();

        component.switchAccount();
        component.editProfile();
        component.signOut();

        expect(session.cambiarCuenta).toHaveBeenCalled();
        expect(session.editarPerfil).toHaveBeenCalled();
        expect(session.salir).toHaveBeenCalled();
        expect('reauthenticationTicket' in component).toBeFalse();
        expect('passwordForm' in component).toBeFalse();
    });

    it('avisa si la plataforma no deja cerrar la sesión', async () => {
        const { component, session, snackBar } = createComponent();
        const failure = new Error('No hemos podido cerrar la sesión.');
        session.salir.and.rejectWith(failure);

        component.signOut();
        await Promise.resolve();
        await Promise.resolve();

        expect(snackBar.openApiError).toHaveBeenCalledWith(failure, 'No se pudo cerrar la sesión');
    });

    it('exposes mobile moderation and block lists as independent back-aware surfaces', () => {
        const { component } = createComponent(true);

        component.openModerationSurface();
        component.openBlockedProfilesSurface();
        expect(component.moderationSurfaceOpen).toBeTrue();
        expect(component.blockedProfilesSurfaceOpen).toBeTrue();

        component.closeModerationSurface();
        component.closeBlockedProfilesSurface();
        expect(component.moderationSurfaceOpen).toBeFalse();
        expect(component.blockedProfilesSurfaceOpen).toBeFalse();
    });

    it('opens one community policy at a time as a mobile reading surface', () => {
        const { component } = createComponent(true);
        const policy = {
            Tipo: 'uso', Version: 3, Titulo: 'Normas de uso', Markdown: '# Respeto',
            FechaPublicacion: '2026-09-07T08:00:00Z', Aceptada: true
        } as const;

        component.openPolicySurface(policy);
        expect(component.selectedPolicy).toBe(policy);

        component.closeSurfaceWithEscape();
        expect(component.selectedPolicy).toBeNull();
    });
});
