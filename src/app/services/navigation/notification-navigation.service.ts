import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationContextType } from '../../interfaces/notification';

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
                return this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'requests' } });
            case 'review_report':
                return this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'reports' } });
            case 'moderation_appeal':
                return this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'moderation' } });
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
}
