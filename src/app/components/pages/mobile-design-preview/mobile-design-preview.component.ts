import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { MobileAppBarComponent } from '../../mobile/ui/mobile-app-bar/mobile-app-bar.component';
import { MobileNavigationComponent, MobileNavigationItem } from '../../mobile/ui/mobile-navigation/mobile-navigation.component';
import { MobileStateComponent } from '../../mobile/ui/mobile-state/mobile-state.component';

type MobilePreviewScreen = 'login' | 'library' | 'chapter' | 'community' | 'security';

const SCREENS = new Set<MobilePreviewScreen>(['login', 'library', 'chapter', 'community', 'security']);

@Component({
    selector: 'app-mobile-design-preview',
    standalone: true,
    imports: [MatIconModule, MobileAppBarComponent, MobileNavigationComponent, MobileStateComponent],
    templateUrl: './mobile-design-preview.component.html',
    styleUrl: './mobile-design-preview.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileDesignPreviewComponent {
    readonly screen = signal<MobilePreviewScreen>('library');

    constructor(route: ActivatedRoute) {
        route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
            const candidate = params.get('screen') as MobilePreviewScreen | null;
            this.screen.set(candidate && SCREENS.has(candidate) ? candidate : 'library');
        });
    }

    get title(): string {
        return ({
            login: 'Acceso',
            library: 'Tu biblioteca',
            chapter: 'La puerta entreabierta',
            community: 'Comunidad',
            security: 'Cuenta y seguridad'
        } as const)[this.screen()];
    }

    get activeNavigation(): MobileNavigationItem['id'] {
        if (this.screen() === 'community') return 'community';
        if (this.screen() === 'security') return 'more';
        return 'library';
    }
}
