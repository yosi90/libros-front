import type { Page } from '@playwright/test';
import { installYosiftwareSdkDouble } from './yosiftware-sdk-double';

/** La persona de las regresiones: su cuenta de Yosiftware (doble del SDK) y su usuario local de Libros. */
const localUser = { Id: 37, Nombre: 'Lector de prueba', Role: { Id: 1, Nombre: 'usuario' } };
const localAccount = { id: '0d0c37aa-0000-4000-8000-000000000037', alias: 'lector_prueba' };

export const visualBook = {
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
    Localizaciones: [
        { Id: 31, Nombre: 'Ciudad de Bruma', Entradas: [] },
        { Id: 32, Nombre: 'Sin localización', Entradas: [] }
    ],
    Conceptos: [{ Id: 51, Nombre: 'Cartografía viva', Entradas: [] }],
    Organizaciones: [],
    Eventos: [],
    Citas: [],
    Universo: { Id: 61, Nombre: 'Archipiélago de tinta' },
    Saga: { Id: 0, Nombre: 'Sin saga' },
    Orden: 1
} as const;

/**
 * Sesión local simulada. Por defecto la presentación Web queda desactivada para
 * que las regresiones de Wood y Mobile vean su presentación de siempre; las
 * pruebas de vistas Web pasan `{ webPresentation: true }`.
 */
export async function installLocalVisualSession(page: Page, options: { webPresentation?: boolean; admin?: boolean } = {}): Promise<void> {
        const user = options.admin ? { ...localUser, Role: { Id: 2, Nombre: 'administrador' } } : localUser;
        if (!options.webPresentation)
            await page.addInitScript(() => { try { localStorage.setItem('book-front:web-presentation', 'off'); } catch { /* sin almacenamiento */ } });
        // Entra con la cuenta de Yosiftware (doble del SDK) y Libros reconoce a su usuario local.
        await installYosiftwareSdkDouble(page, { cuenta: localAccount });
        await page.route('**/usuarios/me', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user })
        }));
        await page.route('**/comunidad/capacidades', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                UsuarioId: localUser.Id,
                VersionConfiguracion: 1,
                VersionCliente: '1.0.0',
                FechaExpiracion: null,
                CacheTtlSegundos: 300,
                Conservadora: true,
                Capacidades: { clubes: { Activa: false, VersionMinima: null } }
            })
        }));
        // Lo social es de la plataforma (hito 3): el chat y las relaciones vacíos, sin red.
        await page.route('**/v1/chat/conversaciones', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversaciones: [] }) }));
        await page.route('**/v1/social/resumen', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ solicitudesRecibidas: 0, solicitudesEnviadas: 0, amistades: 0, seguidos: 0, seguidores: 0, bloqueos: 0 }) }));
        await page.route('**/v1/social/amistades?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ vinculos: [], cursor: null }) }));
        // Los espacios de los clubes (fase 4): sin espacios ni invitaciones pendientes, sin red.
        await page.route('**/v1/espacios', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ espacios: [] }) }));
        await page.route('**/v1/espacios/invitaciones', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invitaciones: [] }) }));
        // Perfil: datos personales vacíos para que sus apartados carguen sin red.
        const emptyState = { Total: 0, Comprados: 0, Leidos: 0, Pendientes: 0, EnMarcha: 0, PorComprar: 0, QuieroLeer: 0, Descartados: 0, SinEstado: 0 };
        await page.route('**/peticiones/catalogo/mias**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
        await page.route('**/reportes/mios**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
        await page.route('**/biblioteca/actividad_reciente**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
        await page.route('**/universos/metricas', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
            Resumen: { Libros: emptyState, Antologias: emptyState, Secciones: emptyState },
            ComprasUltimosMeses: [], LibroMasRapido: null, LibroMasTiempoPendiente: null, PersonajeMasRecurrente: null,
            TopLibrosMasRapidos: [], PorUniverso: {}
        }) }));
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
}
