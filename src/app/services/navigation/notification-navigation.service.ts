import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../interfaces/notification';

@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
    constructor(private router: Router) { }

    open(notification: AppNotification): Promise<boolean> {
        const context = notification.Contexto;
        switch (notification.ContextoTipo) {
            case 'club':
                return this.navigateId(['dashboard', 'community', 'clubs'], context['ClubId']);
            case 'relationships':
                return this.router.navigate(['/dashboard/community/relationships']);
            case 'catalog_request':
                return this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'requests' } });
            case 'review_report':
                return this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'reports' } });
            case 'moderation_appeal':
                return this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'moderation' } });
            case 'community_moderation':
                return this.openCommunityModeration(notification);
            case 'chat_conversation':
                return this.navigateId(['dashboard', 'chat'], context['ConversacionId']);
            case 'feed_publication':
                return this.navigateId(['dashboard', 'community'], context['PublicacionId'], 'postId');
            case 'user_profile':
                return this.navigateId(['dashboard', 'community', 'users'], context['UsuarioId']);
            case 'none':
                return Promise.resolve(false);
        }
    }

    unavailableMessage(notification: AppNotification): string {
        if (notification.ContextoTipo === 'community_moderation' && notification.Contexto['TipoEntidad'] === 'mensaje')
            return 'Este aviso es informativo. Por privacidad, una resolución sobre un mensaje no incluye acceso a la conversación.';
        return 'El destino de esta notificación ya no está disponible.';
    }

    private openCommunityModeration(notification: AppNotification): Promise<boolean> {
        const entityType = notification.Contexto['TipoEntidad'];
        const entityId = notification.Contexto['EntidadId'];
        if (typeof entityId !== 'number' || !Number.isInteger(entityId) || entityId < 1)
            return Promise.resolve(false);

        switch (entityType) {
            case 'perfil':
                return this.navigateId(['dashboard', 'community', 'users'], entityId);
            case 'club':
                return this.navigateId(['dashboard', 'community', 'clubs'], entityId);
            case 'publicacion':
                return this.router.navigate(['/dashboard/community'], { queryParams: { postId: entityId } });
            case 'comentario':
                return this.router.navigate(['/dashboard/community'], { queryParams: { commentId: entityId } });
            case 'mensaje':
                return Promise.resolve(false);
            default:
                return Promise.resolve(false);
        }
    }

    private navigateId(commands: string[], id: unknown, queryParam?: string): Promise<boolean> {
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 1)
            return Promise.resolve(false);
        return queryParam
            ? this.router.navigate(commands, { queryParams: { [queryParam]: id } })
            : this.router.navigate([...commands, id]);
    }
}
