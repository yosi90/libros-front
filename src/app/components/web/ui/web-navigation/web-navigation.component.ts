import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

export interface WebNavigationItem {
    route: string;
    icon: string;
    label: string;
    exact?: boolean;
    badge?: number;
}

const COLLAPSED_KEY = 'libros:web-nav-collapsed';

/**
 * Navegación principal de la presentación Web: lateral con texto en escritorio,
 * rail de iconos en medium y cajón con app bar en compact.
 */
@Component({
    selector: 'app-web-navigation',
    standalone: true,
    imports: [MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive],
    templateUrl: './web-navigation.component.html',
    styleUrl: './web-navigation.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebNavigationComponent {
    @Input() userName = '';
    @Input() imageUrl = '';
    @Input() communityEnabled = false;
    @Input() chatEnabled = false;
    @Input() unreadChatCount = 0;
    @Input() canAdministrate = false;
    @Output() readonly logoutRequested = new EventEmitter<void>();
    @Output() readonly imageError = new EventEmitter<Event>();

    readonly collapsed = signal(this.readCollapsed());
    readonly drawerOpen = signal(false);

    constructor(router: Router) {
        // El cajón compacto se cierra al navegar.
        router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
            .subscribe(() => this.drawerOpen.set(false));
    }

    get items(): WebNavigationItem[] {
        const items: WebNavigationItem[] = [
            { route: '/dashboard/books', icon: 'auto_stories', label: 'Biblioteca', exact: true },
            { route: '/dashboard/catalog', icon: 'travel_explore', label: 'Catálogo' }
        ];
        if (this.communityEnabled)
            items.push({ route: '/dashboard/community', icon: 'groups', label: 'Comunidad' });
        if (this.chatEnabled)
            items.push({ route: '/dashboard/community/messages', icon: 'forum', label: 'Mensajes', badge: this.unreadChatCount || undefined });
        items.push({ route: '/dashboard/statistics', icon: 'insights', label: 'Estadísticas' });
        return items;
    }

    get initial(): string {
        return (this.userName || '?').trim().charAt(0).toLocaleUpperCase();
    }

    toggleCollapsed(): void {
        this.collapsed.update(value => !value);
        try { localStorage.setItem(COLLAPSED_KEY, String(this.collapsed())); }
        catch { /* Preferencia visual prescindible. */ }
    }

    private readCollapsed(): boolean {
        try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; }
        catch { return false; }
    }
}
