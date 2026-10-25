import { HOJA_ESTILOS_SDK, YosiftwareSdk, cargarSdkDesdeLaPlataforma, esCambioDeIdentidad } from './yosiftware-sdk';

describe('carga del SDK de la plataforma', () => {
    function fakeDocument(existing?: YosiftwareSdk) {
        const head = document.createElement('div');
        const view = { yosiftware: existing } as unknown as Window & { yosiftware?: YosiftwareSdk };
        const doc = {
            defaultView: view,
            head,
            createElement: (tag: string) => document.createElement(tag)
        } as unknown as Document;
        return { doc, head, view };
    }

    it('lo pide a la página de acceso del entorno como módulo, con la hoja de Libros, sin copiarlo', async () => {
        const { doc, head, view } = fakeDocument();
        const sdk = { estado: { tipo: 'sin_sesion' } } as unknown as YosiftwareSdk;

        const loading = cargarSdkDesdeLaPlataforma('https://qa-cuentas.yosiftware.es/sdk/v1/yosiftware.js', doc);
        const script = head.querySelector('script') as HTMLScriptElement;
        expect(script.type).toBe('module');
        expect(script.src).toBe('https://qa-cuentas.yosiftware.es/sdk/v1/yosiftware.js');
        expect(script.dataset['estilos']).toBe(HOJA_ESTILOS_SDK);
        // Las invitaciones a los clubes las pinta Libros (ESPACIOS.md): el SDK no abre su ventana.
        expect(script.dataset['invitaciones']).toBe('propias');

        view.yosiftware = sdk;
        script.onload!(new Event('load'));
        await expectAsync(loading).toBeResolvedTo(sdk);
    });

    it('reutiliza el SDK si ya está en la página', async () => {
        const sdk = {} as YosiftwareSdk;
        const { doc, head } = fakeDocument(sdk);

        await expectAsync(cargarSdkDesdeLaPlataforma('https://cuentas.yosiftware.es/sdk/v1/yosiftware.js', doc)).toBeResolvedTo(sdk);
        expect(head.querySelector('script')).toBeNull();
    });

    it('si la plataforma no responde, retira la etiqueta y falla para reintentarlo después', async () => {
        const { doc, head } = fakeDocument();

        const loading = cargarSdkDesdeLaPlataforma('https://cuentas.yosiftware.es/sdk/v1/yosiftware.js', doc);
        const script = head.querySelector('script') as HTMLScriptElement;
        script.onerror!(new Event('error'));

        await expectAsync(loading).toBeRejectedWithError(/no responde/);
        expect(head.querySelector('script')).toBeNull();
    });

    it('reconoce el rechazo del SDK por cambio de cuenta', () => {
        const error = new Error('La cuenta ha cambiado.');
        error.name = 'CambioDeIdentidad';
        expect(esCambioDeIdentidad(error)).toBeTrue();
        expect(esCambioDeIdentidad(new Error('otro'))).toBeFalse();
    });
});
