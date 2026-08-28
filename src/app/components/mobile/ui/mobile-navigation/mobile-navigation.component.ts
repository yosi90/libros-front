import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface MobileNavigationItem {
    id: 'library' | 'catalog' | 'community' | 'more';
    label: string;
    icon: string;
    route: string | null;
}
@Component({
    selector: 'app-mobile-navigation',
    standalone: true,
    imports: [MatIconModule, RouterLink, RouterLinkActive],
    templateUrl: './mobile-navigation.component.html',
    styleUrl: './mobile-navigation.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavigationComponent {
    @Input() active: MobileNavigationItem['id'] | null = null;
    @Input() communityEnabled = true;
    @Input() moreOpen = false;
    @Output() moreRequested = new EventEmitter<void>();

    readonly items: readonly MobileNavigationItem[] = [
        { id: 'library', label: 'Biblioteca', icon: 'local_library', route: '/dashboard/books' },
        { id: 'catalog', label: 'Catálogo', icon: 'travel_explore', route: '/dashboard/catalog' },
        { id: 'community', label: 'Comunidad', icon: 'forum', route: '/dashboard/community' },
        { id: 'more', label: 'Más', icon: 'more_horiz', route: null }
    ];

    isDisabled(item: MobileNavigationItem): boolean {
        return item.id === 'community' && !this.communityEnabled;
    }
}
