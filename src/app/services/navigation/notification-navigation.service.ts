import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../interfaces/notification';
import { SessionService } from '../auth/session.service';

@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
    constructor(private router: Router, private session: SessionService) { }

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
                return this.session.isAdmin ? this.router.navigate(['/dashboard/adminpanel']) : Promise.resolve(false);
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

    private navigateId(commands: string[], id: unknown, queryParam?: string): Promise<boolean> {
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 1)
            return Promise.resolve(false);
        return queryParam
            ? this.router.navigate(commands, { queryParams: { [queryParam]: id } })
            : this.router.navigate([...commands, id]);
    }
}
