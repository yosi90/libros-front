import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationContextType, NotificationOperationalDestination } from '../../interfaces/notification';

@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
    constructor(private router: Router) { }

    open(notification: AppNotification): Promise<boolean> {
        if (typeof notification.ConversationId === 'number' && Number.isInteger(notification.ConversationId) && notification.ConversationId > 0)
            return this.navigateChat(notification.ConversationId, notification.MessageId);
        return this.openContext(notification.ContextoTipo, notification.Contexto, {
            conversationId: notification.ConversationId,
            messageId: notification.MessageId
        });
    }

    openContext(contextType: NotificationContextType, context: Record<string, string | number | boolean | null>, correlation: { conversationId?: number | null; messageId?: number | null } = {}): Promise<boolean> {
        switch (contextType) {
            case 'club':
                return this.navigateId(['dashboard', 'community', 'clubs'], context['ClubId']);
            case 'relationships':
                return this.router.navigate(['/dashboard/community/friendships']);
            case 'catalog_request':
                return this.navigateOperationalDestination(context['Destino'], 'catalogRequests', 'requests');
            case 'review_report':
                return this.navigateOperationalDestination(context['Destino'], 'reviewReports', 'reports');
            case 'moderation_appeal':
                return this.navigateOperationalDestination(context['Destino'], 'moderation', 'moderation', 'appeals');
            case 'community_moderation':
                return this.openCommunityModeration(context);
            case 'chat_conversation':
                return this.navigateChat(correlation.conversationId ?? context['ConversacionId'], correlation.messageId ?? context['MensajeId']);
            case 'feed_publication':
                return this.navigateId(['dashboard', 'community', 'activity'], context['PublicacionId'], 'postId');
            case 'user_profile':
                return this.navigateId(['dashboard', 'community', 'users'], context['UsuarioId']);
            case 'none':
                return Promise.resolve(false);
            default:
                return Promise.resolve(false);
        }
    }

    unavailableMessage(notification: AppNotification): string {
        if (notification.ContextoTipo === 'community_moderation' && notification.Contexto['TipoEntidad'] === 'mensaje')
            return 'Este aviso es informativo. Por privacidad, una resolución sobre un mensaje no incluye acceso a la conversación.';
        return 'El destino de esta notificación ya no está disponible.';
    }

    private openCommunityModeration(context: Record<string, string | number | boolean | null>): Promise<boolean> {
        if (context['Destino'] === 'cola_denuncias_comunidad')
            return this.router.navigate(['/dashboard/adminpanel'], { queryParams: { section: 'communityReports' } });
        if (context['Destino'] !== undefined && context['Destino'] !== null && context['Destino'] !== 'propio') return Promise.resolve(false);

        const entityType = context['TipoEntidad'];
        const entityId = context['EntidadId'];
        if (typeof entityId !== 'number' || !Number.isInteger(entityId) || entityId < 1)
            return Promise.resolve(false);

        switch (entityType) {
            case 'perfil':
                return this.navigateId(['dashboard', 'community', 'users'], entityId);
            case 'club':
                return this.navigateId(['dashboard', 'community', 'clubs'], entityId);
            case 'publicacion':
                return this.router.navigate(['/dashboard/community/activity'], { queryParams: { postId: entityId } });
            case 'comentario':
                return this.router.navigate(['/dashboard/community/activity'], { queryParams: { commentId: entityId } });
            case 'mensaje':
                return Promise.resolve(false);
            default:
                return Promise.resolve(false);
        }
    }

    private navigateChat(conversationId: unknown, messageId: unknown): Promise<boolean> {
        if (typeof conversationId !== 'number' || !Number.isInteger(conversationId) || conversationId < 1)
            return Promise.resolve(false);
        const validMessageId = typeof messageId === 'number' && Number.isInteger(messageId) && messageId > 0 ? messageId : null;
        return this.router.navigate(['/dashboard/community/messages', conversationId], validMessageId ? { queryParams: { messageId: validMessageId } } : undefined);
    }

    private navigateId(commands: string[], id: unknown, queryParam?: string): Promise<boolean> {
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 1)
            return Promise.resolve(false);
        return queryParam
            ? this.router.navigate(commands, { queryParams: { [queryParam]: id } })
            : this.router.navigate([...commands, id]);
    }

    private navigateOperationalDestination(destination: unknown, adminSection: 'catalogRequests' | 'reviewReports' | 'moderation', profileSection: 'requests' | 'reports' | 'moderation', moderationTab?: 'appeals'): Promise<boolean> {
        if (destination === 'propio' || destination === null || destination === undefined)
            return this.router.navigate(['/dashboard/profile'], { queryParams: { section: profileSection } });
        if (!this.isOperationalDestination(destination)) return Promise.resolve(false);
        if (destination === 'cola_alegaciones' && adminSection === 'moderation')
            return this.router.navigate(['/dashboard/adminpanel'], { queryParams: { section: adminSection, tab: moderationTab } });
        if (destination === 'cola_catalogo' && adminSection === 'catalogRequests')
            return this.router.navigate(['/dashboard/adminpanel'], { queryParams: { section: adminSection } });
        if (destination === 'cola_reportes' && adminSection === 'reviewReports')
            return this.router.navigate(['/dashboard/adminpanel'], { queryParams: { section: adminSection } });
        return Promise.resolve(false);
    }

    private isOperationalDestination(value: unknown): value is NotificationOperationalDestination {
        return value === 'propio' || value === 'cola_catalogo' || value === 'cola_reportes' || value === 'cola_denuncias_comunidad' || value === 'cola_alegaciones';
    }
}
