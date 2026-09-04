import { NativePermissionsService } from './native-permissions.service';

describe('NativePermissionsService', () => {
    it('normaliza los estados devueltos por Android, incluido acceso limitado a fotos', async () => {
        const plugin = {
            status: jasmine.createSpy().and.resolveTo({ notifications: 'GRANTED', camera: 'prompt', photos: 'limited', microphone: 'denied' }),
            request: jasmine.createSpy(),
            openSettings: jasmine.createSpy()
        };
        const service = new NativePermissionsService(plugin as never, true);

        await expectAsync(service.status()).toBeResolvedTo({
            notifications: 'granted', camera: 'prompt', photos: 'limited', microphone: 'denied'
        });
    });

    it('no invoca el puente nativo fuera de Android', async () => {
        const plugin = jasmine.createSpyObj('AppPermissions', ['status', 'request', 'openSettings']);
        const service = new NativePermissionsService(plugin, false);

        const states = await service.request('camera');
        await service.openSettings();

        expect(states.camera).toBe('unsupported');
        expect(plugin.request).not.toHaveBeenCalled();
        expect(plugin.openSettings).not.toHaveBeenCalled();
    });
});
