import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { MobileAppBarComponent } from '../../mobile/ui/mobile-app-bar/mobile-app-bar.component';
import { MobileNavigationComponent, MobileNavigationItem } from '../../mobile/ui/mobile-navigation/mobile-navigation.component';
import { MobileStateComponent } from '../../mobile/ui/mobile-state/mobile-state.component';
import { CountryAutocompleteComponent } from '../../shared/common/country-autocomplete/country-autocomplete.component';
import { NativeReaderIslandComponent } from '../../mobile/book/native-reader-island/native-reader-island.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NativeReaderSessionState } from '../../../interfaces/native-reader';

type MobilePreviewScreen = 'login' | 'library' | 'chapter' | 'community' | 'security' | 'onboarding' | 'reader';

const SCREENS = new Set<MobilePreviewScreen>(['login', 'library', 'chapter', 'community', 'security', 'onboarding', 'reader']);

@Component({
    selector: 'app-mobile-design-preview',
    standalone: true,
    imports: [MatIconModule, MobileAppBarComponent, MobileNavigationComponent, MobileStateComponent, CountryAutocompleteComponent, NativeReaderIslandComponent, ReactiveFormsModule],
    templateUrl: './mobile-design-preview.component.html',
    styleUrl: './mobile-design-preview.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileDesignPreviewComponent {
    readonly screen = signal<MobilePreviewScreen>('library');
    readonly countryCode = new FormControl<string | null>(null);
    readonly readerPreview: NativeReaderSessionState = {
        mode: 'minimized', transition: 'idle', bookId: 7,
        bookName: 'El atlas de las historias que todavía recordamos', coverUrl: '',
        readerUrl: '/book/7/chapter/3', backgroundUrl: '/dashboard/books', saving: false
    };

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
            security: 'Cuenta y seguridad',
            onboarding: 'Completa tu biblioteca',
            reader: 'Tu biblioteca'
        } as const)[this.screen()];
    }

    get activeNavigation(): MobileNavigationItem['id'] {
        if (this.screen() === 'community') return 'community';
        if (this.screen() === 'security' || this.screen() === 'onboarding') return 'more';
        return 'library';
    }
}
