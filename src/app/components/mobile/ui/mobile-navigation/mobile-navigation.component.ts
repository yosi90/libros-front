import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationBellComponent } from '../../../shared/common/notification-bell/notification-bell.component';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';

export interface MobileNavigationItem {
    id: 'profile' | 'library' | 'catalog' | 'community' | 'notifications' | 'preferences' | 'more' | 'statistics';
    label: string;
    icon: string;
    route: string | null;
    railOnly?: boolean;
}
@Component({
    selector: 'app-mobile-navigation',
    standalone: true,
    imports: [MatIconModule, RouterLink, RouterLinkActive, NotificationBellComponent],
    templateUrl: './mobile-navigation.component.html',
    styleUrl: './mobile-navigation.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavigationComponent {
    @Input() active: MobileNavigationItem['id'] | null = null;
    @Input() communityEnabled = true;
    @Input() moreOpen = false;
    @Input() imageUrl = '';
    @Input() unreadChatCount = 0;
    @Output() moreRequested = new EventEmitter<void>();
    @Output() imageError = new EventEmitter<Event>();

    readonly items: readonly MobileNavigationItem[] = [
        { id: 'profile', label: 'Perfil', icon: 'person', route: '/dashboard/profile', railOnly: true },
        { id: 'library', label: 'Biblioteca', icon: 'local_library', route: '/dashboard/books' },
        { id: 'catalog', label: 'Catálogo', icon: 'travel_explore', route: '/dashboard/catalog' },
        { id: 'community', label: 'Comunidad', icon: 'forum', route: '/dashboard/community' },
        { id: 'notifications', label: 'Avisos', icon: 'notifications', route: null, railOnly: true },
        { id: 'statistics', label: 'Estadísticas', icon: 'bar_chart', route: '/dashboard/statistics', railOnly: true },
        { id: 'more', label: 'Más', icon: 'more_horiz', route: null },
        { id: 'preferences', label: 'Preferencias', icon: 'settings', route: '/dashboard/preferences', railOnly: true }
    ];

    constructor(readonly layout: AdaptiveLayoutService) {}

    isDisabled(item: MobileNavigationItem): boolean {
        return item.id === 'community' && !this.communityEnabled;
    }
}
