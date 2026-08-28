import { NativeAppLinksService } from './native-app-links.service';

describe('NativeAppLinksService', () => {
    it('navega solo a handlers permitidos del dominio configurado', async () => {
        let listener: ((event: { url: string }) => void) | undefined;
        const app = {
            addListener: jasmine.createSpy().and.callFake(async (_name: string, callback: (event: { url: string }) => void) => {
                listener = callback;
                return { remove: async () => void 0 };
            }),
            getLaunchUrl: jasmine.createSpy().and.resolveTo(undefined)
        };
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        const service = new NativeAppLinksService(router, app as never, true);

        await service.initialize();
        listener?.({ url: 'https://libros.yosiftware.es/reset-password?mode=resetPassword' });
        listener?.({ url: 'https://attacker.example/reset-password' });

        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/reset-password?mode=resetPassword');
    });

    it('no registra listeners fuera de Android', async () => {
        const app = jasmine.createSpyObj('App', ['addListener', 'getLaunchUrl']);
        const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
        const service = new NativeAppLinksService(router, app, false);

        await service.initialize();

        expect(app.addListener).not.toHaveBeenCalled();
    });
});
