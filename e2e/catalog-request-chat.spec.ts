import { expect, test } from './fixtures/test';
import { installLocalVisualSession } from './support/local-visual-session';

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const projection = (estado: 'aprobada' | 'devuelta', texto: string) => ({
    Id: 27, NombreUsuario: 'Ana Lectora', TipoEntidad: 'libro', Accion: 'alta', Estado: estado, Texto: texto
});
const resolved = projection('aprobada', 'Ana Lectora ha realizado una petición de alta de libro. Ya resuelta: aprobada.');
const returned = projection('devuelta', 'Ana Lectora ha realizado una petición de alta de libro. Devuelta al usuario.');
const message = (id: number, request: typeof resolved) => ({
    Id: id, RemitenteId: null, TipoRemitente: 'sistema', CuerpoMarkdown: 'Nueva petición de catálogo',
    FechaEnvio: '2026-09-29T10:00:00Z', FechaEdicion: null, Eliminado: false,
    CodigoSistema: 'catalog_request.pending', SeveridadSistema: 'info',
    Accion: { ContextoTipo: 'catalog_request', Contexto: { Id: 27, Destino: 'cola_catalogo' } },
    NotificacionId: null, PeticionCatalogo: request,
    Reacciones: { PorTipo: { me_gusta: 0, risa: 0, sorpresa: 0, triste: 0, apoyo: 0 }, MiReaccion: null },
    Permisos: { PuedeResponder: false, PuedeReaccionar: false, PuedeEditar: false, PuedeBorrar: false, PuedeDenunciar: false },
    MensajeRespondido: null
});

test('Yosiftware muestra el estado vigente de las peticiones en la bandeja y el historial', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    await installLocalVisualSession(page, { webPresentation: true, admin: true });
    await page.route('**/comunidad/capacidades', route => route.fulfill(json({
        success: true, UsuarioId: 37, VersionConfiguracion: 1, VersionCliente: '1.0.0', FechaExpiracion: null,
        CacheTtlSegundos: 300, Conservadora: false,
        Capacidades: Object.fromEntries(['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes']
            .map(id => [id, { Activa: id === 'chat', VersionMinima: null }]))
    })));
    await page.route('**/comunidad/resumen', route => route.fulfill(json({ success: true, Parcial: false, BloquesFallidos: [], Resumen: {
        Relaciones: { Amistades: 0, SolicitudesRecibidasPendientes: 0, Seguidores: 0, Seguidos: 0 },
        Clubes: { Activos: 0, InvitacionesPendientes: 0 },
        Mensajes: { NoLeidos: 0, NoLeidosHumanos: 0, NoLeidosSistema: 0 }
    } })));
    await page.route('**/chat/conversaciones**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/mensajes')) return route.fulfill(json({ success: true, Mensajes: [message(81, resolved), message(82, returned)], SiguienteBeforeId: null }));
        if (path.endsWith('/99')) return route.fulfill(json({ success: true, Conversacion: {
            Id: 99, Tipo: 'sistema', Titulo: 'Yosiftware', ClubId: null, CreadorId: null, EsSistema: true,
            PuedeEnviar: false, PuedeGestionarParticipantes: false, Participantes: []
        } }));
        return route.fulfill(json({ success: true, Conversaciones: [{
            Id: 99, Tipo: 'sistema', Titulo: 'Yosiftware', ClubId: null, FechaUltimoMensaje: '2026-09-29T10:00:00Z',
            NoLeidos: 0, PuedeEnviar: false, EsSistema: true,
            UltimoMensaje: { Id: 82, VistaPrevia: returned.Texto, FechaEnvio: '2026-09-29T10:00:00Z', TipoRemitente: 'sistema', PeticionCatalogo: returned }
        }] }));
    });
    await page.route('**/chat/conversaciones/99/leer', route => route.fulfill(json({ success: true })));
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/dashboard/community/messages/99');

    await expect(page.locator('.thread__preview')).toContainText('Devuelta al usuario');
    await expect(page.locator('.message[data-request-state="aprobada"]')).toContainText('Ya resuelta: aprobada');
    await expect(page.locator('.message[data-request-state="devuelta"]')).toContainText('Devuelta al usuario');
    await expect(page.getByText('Nueva petición de catálogo', { exact: true })).toHaveCount(0);
});
