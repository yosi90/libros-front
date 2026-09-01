import { NativeRuntimeService } from './native-runtime.service';

describe('NativeRuntimeService', () => {
    it('sincroniza red y revalida el estado al volver a primer plano', async () => {
        let networkChange: ((status: { connected: boolean }) => void) | undefined;
        let appStateChange: ((state: { isActive: boolean }) => void) | undefined;
        const network = {
            getStatus: jasmine.createSpy().and.resolveTo({ connected: true, connectionType: 'wifi' }),
            addListener: jasmine.createSpy().and.callFake(async (_event: string, callback: (status: { connected: boolean }) => void) => {
                networkChange = callback;
                return { remove: async () => void 0 };
            })
        };
        const app = {
            addListener: jasmine.createSpy().and.callFake(async (event: string, callback: (value: never) => void) => {
                if (event === 'appStateChange') appStateChange = callback as (state: { isActive: boolean }) => void;
                return { remove: async () => void 0 };
            }),
            exitApp: jasmine.createSpy().and.resolveTo(undefined)
        };
        const connectivity = jasmine.createSpyObj('ConnectivityService', ['setNativeOnline']);
        const location = jasmine.createSpyObj('Location', ['back']);
        const service = new NativeRuntimeService(location, connectivity, document, app as never, network as never, true);

        await service.initialize();
        networkChange?.({ connected: false });
        appStateChange?.({ isActive: true });
        await Promise.resolve();

        expect(connectivity.setNativeOnline).toHaveBeenCalledWith(true);
        expect(connectivity.setNativeOnline).toHaveBeenCalledWith(false);
        expect(network.getStatus).toHaveBeenCalledTimes(2);
    });

    it('cierra primero un diálogo y solo después navega o sale', async () => {
        let back: ((event: { canGoBack: boolean }) => void) | undefined;
        const app = {
            addListener: jasmine.createSpy().and.callFake(async (event: string, callback: (value: never) => void) => {
                if (event === 'backButton') back = callback as (value: { canGoBack: boolean }) => void;
                return { remove: async () => void 0 };
            }),
            exitApp: jasmine.createSpy().and.resolveTo(undefined)
        };
        const network = {
            getStatus: jasmine.createSpy().and.resolveTo({ connected: true, connectionType: 'wifi' }),
            addListener: jasmine.createSpy().and.resolveTo({ remove: async () => void 0 })
        };
        const connectivity = jasmine.createSpyObj('ConnectivityService', ['setNativeOnline']);
        const location = jasmine.createSpyObj('Location', ['back']);
        const service = new NativeRuntimeService(location, connectivity, document, app as never, network as never, true);
        const container = document.createElement('div');
        container.className = 'cdk-overlay-container';
        container.innerHTML = '<section role="dialog"></section>';
        document.body.appendChild(container);
        const escape = jasmine.createSpy();
        document.addEventListener('keydown', escape, { once: true });

        await service.initialize();
        back?.({ canGoBack: true });
        expect(escape).toHaveBeenCalled();
        expect(location.back).not.toHaveBeenCalled();

        container.remove();
        back?.({ canGoBack: true });
        back?.({ canGoBack: false });
        expect(location.back).toHaveBeenCalledTimes(1);
        expect(app.exitApp).toHaveBeenCalledTimes(1);
    });

    it('no registra listeners fuera de Android', async () => {
        const app = jasmine.createSpyObj('App', ['addListener']);
        const network = jasmine.createSpyObj('Network', ['getStatus', 'addListener']);
        const service = new NativeRuntimeService(
            jasmine.createSpyObj('Location', ['back']),
            jasmine.createSpyObj('ConnectivityService', ['setNativeOnline']),
            document,
            app,
            network,
            false
        );

        await service.initialize();

        expect(app.addListener).not.toHaveBeenCalled();
        expect(network.getStatus).not.toHaveBeenCalled();
    });

    it('cierra una superficie Mobile registrada antes de delegar el back al lector', async () => {
        let back: ((event: { canGoBack: boolean }) => void) | undefined;
        const app = {
            addListener: jasmine.createSpy().and.callFake(async (event: string, callback: (value: never) => void) => {
                if (event === 'backButton') back = callback as (value: { canGoBack: boolean }) => void;
                return { remove: async () => void 0 };
            }),
            exitApp: jasmine.createSpy().and.resolveTo(undefined)
        };
        const network = {
            getStatus: jasmine.createSpy().and.resolveTo({ connected: true, connectionType: 'wifi' }),
            addListener: jasmine.createSpy().and.resolveTo({ remove: async () => void 0 })
        };
        const close = document.createElement('button');
        close.setAttribute('aria-label', 'Volver a la biblioteca');
        close.setAttribute('data-native-back-action', '');
        const panel = document.createElement('section');
        panel.setAttribute('data-native-back-overlay', '');
        panel.appendChild(close);
        document.body.appendChild(panel);
        spyOn(close, 'click').and.callThrough();
        const nativeReader = jasmine.createSpyObj('NativeReaderSessionService', ['handleNativeBack']);
        const service = new NativeRuntimeService(
            jasmine.createSpyObj('Location', ['back']),
            jasmine.createSpyObj('ConnectivityService', ['setNativeOnline']),
            document,
            app as never,
            network as never,
            true,
            nativeReader
        );

        await service.initialize();
        back?.({ canGoBack: true });

        expect(close.click).toHaveBeenCalled();
        expect(nativeReader.handleNativeBack).not.toHaveBeenCalled();
        panel.remove();
    });
});
