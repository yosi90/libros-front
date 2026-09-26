import { ChangeDetectionStrategy, Component, computed, HostBinding, Inject, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
import { WEB_VIEWS_READY } from '../../../../services/ui/presentation-mode.service';
import { WebThemeChoice, WebThemeService } from '../../../../services/ui/web-theme.service';

interface ThemeOption {
    id: WebThemeChoice;
    label: string;
    description: string;
}

// Selector de tema del navegador. Se guarda por dispositivo; la APK no lo muestra.
@Component({
    selector: 'app-appearance-preferences',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './appearance-preferences.component.html',
    styleUrl: './appearance-preferences.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppearancePreferencesComponent {
    readonly options: ThemeOption[] = [
        { id: 'light', label: 'Claro', description: 'Limpio y luminoso, pensado para leer.' },
        { id: 'dark', label: 'Oscuro', description: 'El mismo diseño con menos luz.' },
        { id: 'wood', label: 'Wood', description: 'Cuero, papel y dorados. Solo en escritorio.' }
    ];

    /** Bienvenida: sin cabecera ni aviso de transición y siempre con los colores Web. */
    @Input() @HostBinding('class.is-onboarding') onboarding = false;

    readonly isDesktop = computed(() => this.adaptiveLayout.state().isDesktop);
    readonly choice = this.webTheme.choice;
    // Transición: Claro/Oscuro todavía no tienen vistas de escritorio propias.
    readonly showDesktopTransitionNote = computed(() =>
        !this.webViewsReady && this.isDesktop() && this.choice() !== 'wood');

    constructor(
        private webTheme: WebThemeService,
        private adaptiveLayout: AdaptiveLayoutService,
        @Inject(WEB_VIEWS_READY) private webViewsReady: boolean
    ) { }

    isDisabled(option: ThemeOption): boolean {
        return option.id === 'wood' && !this.isDesktop();
    }

    select(option: ThemeOption): void {
        if (this.isDisabled(option)) return;
        this.webTheme.select(option.id);
    }
}
