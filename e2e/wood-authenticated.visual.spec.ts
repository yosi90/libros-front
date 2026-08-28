import { expect, test } from './fixtures/test';

const authenticatedSession = {
    success: true,
    Estado: 'authenticated',
    AccessToken: 'local-visual-access-token',
    ExpiresIn: 900,
    CsrfToken: 'local-visual-csrf-token',
    Usuario: {
        Id: 37,
        Nombre: 'Lector de prueba',
        Email: 'lector@example.test',
        Imagen: 'missing-local-avatar.png',
        Username: 'lector_prueba',
        DisplayName: 'Lector de prueba',
        PerfilPublico: false,
        MostrarEstadisticas: true,
        MostrarBiblioteca: true,
        PermitirMensajes: false,
        EmailVerificado: true,
        VerificationPending: false,
        Role: { Id: 1, Nombre: 'usuario' }
    }
} as const;

const visualBook = {
    Id: 73,
    Nombre: 'El atlas de las historias',
    Estados: [{ Id: 1, Nombre: 'En marcha', EstadoId: 1, Fecha: '2026-08-20T10:00:00Z' }],
    Portada: 'missing-local-cover.png',
    Wiki: 'https://example.test/wiki',
    Autores: [{ Id: 8, Nombre: 'Ada Lectora' }],
    Capitulos: [
        {
            Id: 11,
            Nombre: 'La puerta entreabierta',
            Orden: 1,
            Pagina: 1,
            PaginaFinal: 14,
            Escenas: [{
                Id: 101,
                Nombre: 'La llegada',
                Descripcion: '{\\rtf1\\ansi La ciudad aparece tras la lluvia.}',
                Localizacion: { Id: 31, Nombre: 'Ciudad de Bruma', Entradas: [] },
                Personajes: [{ Id: 21, Nombrado: false }],
                PersonajesDetalle: [{ Id: 21, Nombrado: false }],
                Valida: true,
                Eliminable: false
            }]
        },
        { Id: 12, Nombre: 'El mapa imposible', Orden: 2, Pagina: 15, PaginaFinal: 29, Escenas: [] }
    ],
    Partes: [{ Id: 41, Nombre: 'Primera parte', Orden_inicio: 1, Orden_final: 2, Pagina: 1 }],
    Interludios: [],
    Personajes: [{
        Id: 21,
        Nombre: 'Iria Valverde',
        Sexo: false,
        Grupo: 'Principales',
        OrdenGrupo: 1,
        Apariciones: 1,
        Nombramientos: 0,
        Entradas: [],
        Apodos: [],
        Estados: [],
        Relaciones: []
    }],
    Localizaciones: [{ Id: 31, Nombre: 'Ciudad de Bruma', Entradas: [] }],
    Conceptos: [{ Id: 51, Nombre: 'Cartografía viva', Entradas: [] }],
    Organizaciones: [],
    Eventos: [],
    Citas: [],
    Universo: { Id: 61, Nombre: 'Archipiélago de tinta' },
    Saga: { Id: 0, Nombre: 'Sin saga' },
    Orden: 1
} as const;

test.describe('regresion visual Wood autenticada @visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Los baselines visuales se mantienen en Chromium.');

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('book-front:theme:v1', 'dark');
        });

        await page.route('**/runtime-config', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                Environment: 'local',
                QaDatasetVersion: null,
                RealtimeWsUrl: '',
                Firebase: { Providers: { Password: true, Google: true, Phone: true } }
            })
        }));
        await page.route('**/auth/session/csrf', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, CsrfToken: authenticatedSession.CsrfToken })
        }));
        await page.route('**/auth/session/refresh', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(authenticatedSession)
        }));
        await page.route('**/auth/access-methods', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                Metodos: [
                    { Metodo: 'password', ProveedorFirebase: 'password', Recuperable: true, FechaVinculacion: '2026-08-01T10:00:00Z' },
                    { Metodo: 'google', ProveedorFirebase: 'google.com', Recuperable: true, FechaVinculacion: '2026-08-02T10:00:00Z' }
                ]
            })
        }));
        await page.route('**/auth/sessions', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                Sesiones: [{
                    Id: 'current-session',
                    NombreDispositivo: 'Chromium en escritorio',
                    FechaCreacion: '2026-08-01T10:00:00Z',
                    FechaUltimaActividad: '2026-08-26T10:00:00Z',
                    FechaExpiracionInactividad: '2026-09-25T10:00:00Z',
                    FechaExpiracionAbsoluta: '2026-11-24T10:00:00Z',
                    Revocada: false,
                    EsActual: true
                }]
            })
        }));
        await page.route('**/usuarios/me/preferencias-interfaz', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                Preferencias: { Tema: 'dark', Version: 3, FechaActualizacion: '2026-08-20T10:00:00Z' }
            })
        }));
        await page.route('**/comunidad/capacidades', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                UsuarioId: authenticatedSession.Usuario.Id,
                VersionConfiguracion: 1,
                VersionCliente: '1.0.0',
                FechaExpiracion: null,
                CacheTtlSegundos: 300,
                Conservadora: true,
                Capacidades: Object.fromEntries(['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes']
                    .map(id => [id, { Activa: false, VersionMinima: null }]))
            })
        }));
        await page.route('**/moderacion/mi-estado-acceso', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                AlcancesActivos: [],
                Restricciones: [],
                Sanciones: [],
                Politicas: [],
                RequiereLimpiarRealtime: false,
                AlcancesQueRevocanRealtime: []
            })
        }));
        await page.route('**/coleccion/universos', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]'
        }));
        await page.route('**/catalogo/autores', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]'
        }));
        await page.route('**/notificaciones?**', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, Notificaciones: [], NoLeidas: 0, SiguienteCursor: null })
        }));
        await page.route('**/chat/preferencias-flotantes', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                Preferencias: {
                    VersionShape: 1,
                    Version: 1,
                    FechaActualizacion: null,
                    AutoabrirListado: false,
                    PermitirBurbujas: true,
                    ModoListado: 'normal',
                    PosicionListado: null,
                    TamanoListado: null,
                    ConversacionesFlotantes: []
                }
            })
        }));
        await page.route('**/image/get/**', route => route.fulfill({
            status: 200,
            contentType: 'image/png',
            path: 'src/assets/media/img/error.png'
        }));
        await page.route('**/libros/73', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(visualBook)
        }));
        await page.route('**/personajes/estados/catalogo', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { Id: 1, Nombre: 'Vivo' },
                { Id: 2, Nombre: 'Desaparecido' }
            ])
        }));
    });

    test('Cuenta y seguridad se integra en el escritorio Wood', async ({ page }) => {
        await page.goto('/dashboard/account-security');
        await expect(page.getByRole('heading', { name: 'Cuenta y seguridad' })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-theme-requested', 'dark');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'wood');
        await expect(page.locator('.library-shell')).toHaveClass(/library-shell--wood/);
        await expect(page).toHaveScreenshot('account-security.webp', { fullPage: true, animations: 'disabled' });
    });

    test('Administracion no se puede abrir desde Mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/dashboard/adminpanel');
        await expect(page).toHaveURL(/\/dashboard\/books(?:[?#]|$)/);
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'mobile');
    });

    test('El shell, indice y busqueda del libro conservan Wood', async ({ page }) => {
        await page.goto('/book/73/search');
        await expect(page.getByRole('heading', { name: 'Búsqueda avanzada' })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'wood');
        await expect(page).toHaveScreenshot('book-search.webp', { fullPage: true, animations: 'disabled' });
    });

    test('El editor de capítulo conserva la composición Wood', async ({ page }) => {
        await page.goto('/book/73/chapter/11');
        await expect(page.getByRole('heading', { name: 'Escenas' })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'wood');
        await page.evaluate(() => {
            window.scrollTo(0, 0);
            document.querySelectorAll<HTMLElement>('.book-content, .book-router-frame, .chapter-editor')
                .forEach(element => element.scrollTop = 0);
        });
        await expect(page).toHaveScreenshot('chapter-editor.webp', { fullPage: true, animations: 'disabled' });
    });

    test('Las entidades narrativas conservan la superficie Wood', async ({ page }) => {
        await page.goto('/book/73/characters');
        await expect(page.getByRole('heading', { name: 'Personajes' })).toBeVisible();
        await expect(page.getByText('Iria Valverde', { exact: true })).toBeVisible();
        await expect(page.locator('.dragon-loader')).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-presentation-target', 'wood');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'wood');
        await page.evaluate(() => {
            window.scrollTo(0, 0);
            document.querySelectorAll<HTMLElement>('.book-content, .book-router-frame, .narrative-entity-page')
                .forEach(element => element.scrollTop = 0);
        });
        await expect(page).toHaveScreenshot('narrative-characters.webp', { fullPage: true, animations: 'disabled' });
    });
});
