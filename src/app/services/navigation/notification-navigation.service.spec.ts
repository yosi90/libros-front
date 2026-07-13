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

    it('ignora tipos desconocidos sin navegar', async () => {
        const opened = await service.openContext('future_action' as NotificationContextType, {});
        expect(opened).toBeFalse();
        expect(navigate).not.toHaveBeenCalled();
    });
});
