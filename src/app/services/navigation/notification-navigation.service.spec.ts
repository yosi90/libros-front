import { AppNotification, NotificationContextType } from '../../interfaces/notification';
import { NotificationNavigationService } from './notification-navigation.service';

describe('NotificationNavigationService', () => {
    let navigate: jasmine.Spy;
    let service: NotificationNavigationService;

    beforeEach(() => {
        navigate = jasmine.createSpy().and.resolveTo(true);
        service = new NotificationNavigationService({ navigate } as never);
    });

    it('prioriza la correlación con Yosiftware y conserva el mensaje concreto', async () => {
        const notification: AppNotification = {
            Id: 4, Codigo: 'sanction_created', Categoria: 'moderacion', ContextoTipo: 'moderation_appeal', Titulo: 'Sanción', Cuerpo: null,
            ConversationId: 12, MessageId: 98, Contexto: { AlegacionId: 7 }, ActorId: null, FechaCreacion: '2026-07-13T00:00:00Z', FechaLectura: null
        };

        await service.open(notification);

        expect(navigate).toHaveBeenCalledWith(['/dashboard/community/messages', 12], { queryParams: { messageId: 98 } });
    });

    it('reutiliza el destino funcional tipado desde un mensaje de sistema', async () => {
        await service.openContext('user_profile', { UsuarioId: 9 });
        expect(navigate).toHaveBeenCalledWith(['dashboard', 'community', 'users', 9]);
    });

    it('lleva una petición de catálogo operativa a su cola administrativa', async () => {
        await service.openContext('catalog_request', { Id: 12, Estado: 'pendiente', Destino: 'cola_catalogo' });
        expect(navigate).toHaveBeenCalledWith(['/dashboard/adminpanel'], { queryParams: { section: 'catalogRequests' } });
    });

    it('lleva una alegación operativa a la cola administrativa correspondiente', async () => {
        await service.openContext('moderation_appeal', { AlegacionId: 4, SancionId: 8, Estado: 'pendiente', Destino: 'cola_alegaciones' });
        expect(navigate).toHaveBeenCalledWith(['/dashboard/adminpanel'], { queryParams: { section: 'moderation', tab: 'appeals' } });
    });

    it('lleva una denuncia comunitaria a la cola segura para moderación', async () => {
        await service.openContext('community_moderation', { GrupoId: 6, Estado: 'pendiente', TipoEntidad: 'club', EntidadId: 3, Destino: 'cola_denuncias_comunidad' });
        expect(navigate).toHaveBeenCalledWith(['/dashboard/adminpanel'], { queryParams: { section: 'communityReports' } });
    });

    it('conserva el destino propio para avisos históricos sin Destino', async () => {
        await service.openContext('review_report', { GrupoId: 8, Estado: 'rechazado' });
        expect(navigate).toHaveBeenCalledWith(['/dashboard/profile'], { queryParams: { section: 'reports' } });
    });

    it('ignora tipos desconocidos sin navegar', async () => {
        const opened = await service.openContext('future_action' as NotificationContextType, {});
        expect(opened).toBeFalse();
        expect(navigate).not.toHaveBeenCalled();
    });
});
