import { ChangeDetectionStrategy, Component, DestroyRef, Input, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { YosiftwareAccountComponent } from '../../../shared/common/yosiftware-account/yosiftware-account.component';
import { YosiftwareNotificationsComponent } from '../../../shared/common/yosiftware-notifications/yosiftware-notifications.component';
import { YosiftwareWebsComponent } from '../../../shared/common/yosiftware-webs/yosiftware-webs.component';

export interface WebNavigationItem {
    route: string;
    icon: string;
    label: string;
    exact?: boolean;
    badge?: number;
}

const COLLAPSED_KEY = 'libros:web-nav-collapsed';
/** Compact: la cabecera es la barra superior; si no, la cuenta va al pie de la navegación lateral. */
const COMPACT_QUERY = '(max-width: 599px)';

/**
 * Navegación principal de la presentación Web: lateral con texto en escritorio,
 * rail de iconos en medium y cajón con app bar en compact.
 */
@Component({
    selector: 'app-web-navigation',
    standalone: true,
    imports: [MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive, YosiftwareAccountComponent, YosiftwareNotificationsComponent, YosiftwareWebsComponent],
    templateUrl: './web-navigation.component.html',
    styleUrl: './web-navigation.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebNavigationComponent {
    @Input() communityEnabled = false;
    @Input() chatEnabled = false;
    @Input() unreadChatCount = 0;

    readonly collapsed = signal(this.readCollapsed());
    readonly drawerOpen = signal(false);
    /**
     * Una sola campana y un solo botón de webs en la página: en la barra compacta o en el pie de la navegación. La
     * campana pone los avisos emergentes; escondida con CSS, no se verían.
     */
    readonly compact = signal(false);

    private readonly currentUrl = signal('');

    constructor(router: Router) {
        this.currentUrl.set(router.url);
        const query = typeof window !== 'undefined' ? window.matchMedia?.(COMPACT_QUERY) : undefined;
        if (query) {
            this.compact.set(query.matches);
            const listener = (event: MediaQueryListEvent) => this.compact.set(event.matches);
            query.addEventListener?.('change', listener);
            inject(DestroyRef).onDestroy(() => query.removeEventListener?.('change', listener));
        }
        // El cajón compacto se cierra al navegar.
        router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed())
            .subscribe(event => {
                this.drawerOpen.set(false);
                this.currentUrl.set(event.urlAfterRedirects);
            });
    }

    /** Mensajes vive bajo /community, pero en la navegación son destinos distintos. */
    isActive(item: WebNavigationItem): boolean {
        const path = this.currentUrl().split(/[?#]/)[0];
        if (item.exact) return path === item.route;
        if (!path.startsWith(item.route)) return false;
        return !(item.route === '/dashboard/community' && path.startsWith('/dashboard/community/messages'));
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
