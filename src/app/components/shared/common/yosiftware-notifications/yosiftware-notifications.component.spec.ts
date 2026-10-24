import { YosiftwareNotificationsComponent, internalTarget } from './yosiftware-notifications.component';

describe('YosiftwareNotificationsComponent', () => {
    const origin = 'https://libros.dev.yosiftware.es';

    it('abre sin recargar los enlaces de Libros, con su consulta', () => {
        expect(internalTarget('https://libros.dev.yosiftware.es/dashboard/profile?section=requests', origin)).toBe('/dashboard/profile?section=requests');
        expect(internalTarget('https://social.yosiftware.es/?vista=amistades', origin)).toBeNull();
        expect(internalTarget('', origin)).toBeNull();
        expect(internalTarget(null, origin)).toBeNull();
    });

    it('cancela el evento del SDK y navega con el enrutador solo si el enlace es de la web', () => {
        const router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
        const component = new YosiftwareNotificationsComponent(router as never);
        const own = new CustomEvent('yosi-notificacion-abrir', { cancelable: true, detail: { enlace: `${window.location.origin}/dashboard/profile?section=reports` } });
        const foreign = new CustomEvent('yosi-notificacion-abrir', { cancelable: true, detail: { enlace: 'https://social.yosiftware.es/?vista=amistades' } });

        component.open(own);
        component.open(foreign);

        expect(own.defaultPrevented).toBeTrue();
        expect(foreign.defaultPrevented).toBeFalse();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/dashboard/profile?section=reports');
    });
});
