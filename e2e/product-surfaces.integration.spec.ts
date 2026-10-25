import { expect, test } from './fixtures/test';

// Superficies publicadas en el Hosting de QA, sin entrar. Las autenticadas entraban con el login propio de Libros, que se
// retiró con la adhesión a Yosiftware: con la cuenta de la plataforma, la sesión es una cookie de su acceso y no se puede
// sembrar desde aquí. Lo autenticado se prueba en local con el doble del SDK (`account-switch.spec.ts`, las vistas Web,
// Wood y Mobile) y, con cuentas reales, a mano en `https://libros.dev.yosiftware.es` (checklist del hito 4).

const HOSTED = /^https:\/\/qa-libros\.yosiftware\.es/;

test.describe('superficies publicadas sin sesión @integration @surfaces', () => {
    test('los recursos visuales conocidos se descargan y decodifican completos', async ({ page, baseURL }) => {
        test.skip(!HOSTED.test(baseURL ?? ''), 'La comprobación requiere los recursos del Hosting QA.');
        await page.goto('/home');
        await expect(page.locator('yosi-acceso').first()).toBeAttached({ timeout: 30_000 });
        const results = await page.evaluate(async resources => Promise.all(resources.map(source => new Promise<{ source: string; width: number; height: number }>((resolve, reject) => {
            const image = new Image();
            image.onload = () => image.decode().then(() => resolve({ source, width: image.naturalWidth, height: image.naturalHeight }), reject);
            image.onerror = () => reject(new Error(`No se pudo decodificar ${source}`));
            image.src = source;
        }))), [
            '/assets/media/img/fondo_libro.png',
            '/assets/media/img/fondo_router.png',
            '/assets/media/img/fondo_desplegable.png',
            // `GET /image/get/photo/{name}` sigue sirviendo los archivos existentes (RUTAS_RETIRADAS.md).
            'https://qa-api.yosiftware.es/image/get/photo/default.png'
        ]);

        expect(results.every(result => result.width > 0 && result.height > 0)).toBe(true);
    });

    for (const profile of [
        { name: 'compacta', viewport: { width: 390, height: 844 } },
        { name: 'escritorio', viewport: { width: 1440, height: 900 } },
        { name: 'ultrapanorámica', viewport: { width: 2560, height: 1080 } }
    ] as const) {
        test(`la portada en ${profile.name}: cuenta de Yosiftware, sin desbordar y sin la administración ni Capacitor`, async ({ page, baseURL }) => {
            test.skip(!HOSTED.test(baseURL ?? ''), 'La comprobación requiere el Hosting QA.');
            await page.setViewportSize(profile.viewport);
            for (const retired of ['/adminpanel', '/dashboard/adminpanel', '/login', '/register']) {
                await page.goto(retired);
                await expect(page).toHaveURL(/\/home(?:[?#].*)?$/);
            }
            await expect(page.locator('yosi-acceso').first()).toBeAttached();
            const state = await page.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                capacitor: 'Capacitor' in window,
                admin: !!document.querySelector('app-adminpanel, a[href*="adminpanel"]')
            }));
            expect(state).toEqual({ overflow: false, capacitor: false, admin: false });
        });
    }
});
