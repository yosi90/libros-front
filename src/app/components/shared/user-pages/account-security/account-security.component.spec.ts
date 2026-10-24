import { AccountSecurityComponent } from './account-security.component';

describe('AccountSecurityComponent', () => {
    function createComponent(mobile = false, section: string | null = null) {
        const session = {
            cuenta: { id: 'cuenta-a', alias: 'lectora', correo: 'lectora@example.test' },
            userName: 'Lectora',
            socialUrl: jasmine.createSpy('socialUrl').and.callFake((vista?: string) => `https://qa-social.yosiftware.es/?vista=${vista}`),
            editarPerfil: jasmine.createSpy('editarPerfil').and.resolveTo(true),
            cambiarCuenta: jasmine.createSpy('cambiarCuenta').and.resolveTo(true),
            salir: jasmine.createSpy('salir').and.resolveTo(),
            privacidad: jasmine.createSpy('privacidad').and.resolveTo(),
            reportar: jasmine.createSpy('reportar').and.resolveTo(true)
        };
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar', 'openApiError']);
        const presentation = { snapshot: { isMobilePresentationActive: mobile } };
        const component = new AccountSecurityComponent(
            session as never,
            snackBar,
            presentation as never,
            { snapshot: { queryParamMap: { get: (key: string) => key === 'section' ? section : null } } } as never
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

    it('lleva las normas, la moderación, los bloqueos y «Tus datos» a la web social, y la privacidad al SDK', () => {
        const { component, session } = createComponent();

        expect(component.socialRulesUrl).toBe('https://qa-social.yosiftware.es/?vista=normas');
        expect(component.socialModerationUrl).toBe('https://qa-social.yosiftware.es/?vista=moderacion');
        expect(component.socialBlocksUrl).toBe('https://qa-social.yosiftware.es/?vista=bloqueos');
        expect(component.socialDataUrl).toBe('https://qa-social.yosiftware.es/?vista=cuenta');

        component.openPrivacy();
        component.requestLibrosData();
        expect(session.privacidad).toHaveBeenCalled();
        expect(session.reportar).toHaveBeenCalledWith('propuesta');
        expect('policies' in component).toBeFalse();
        expect('blockedProfiles' in component).toBeFalse();
    });

    it('los enlaces antiguos a normas, moderación o bloqueos abren la privacidad', () => {
        for (const section of ['policies', 'moderation', 'blocks']) {
            const { component } = createComponent(false, section);
            component.ngOnInit();
            expect(component.woodSection).withContext(section).toBe('privacy');
        }
    });
});
