import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface MobileNavigationItem {
    id: 'library' | 'catalog' | 'community' | 'more';
    label: string;
    icon: string;
}
@Component({
    selector: 'app-mobile-navigation',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './mobile-navigation.component.html',
    styleUrl: './mobile-navigation.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavigationComponent {
    @Input() active: MobileNavigationItem['id'] = 'library';

    readonly items: readonly MobileNavigationItem[] = [
        { id: 'library', label: 'Biblioteca', icon: 'local_library' },
        { id: 'catalog', label: 'Catálogo', icon: 'travel_explore' },
        { id: 'community', label: 'Comunidad', icon: 'forum' },
        { id: 'more', label: 'Más', icon: 'more_horiz' }
    ];
}
