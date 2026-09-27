import { ChangeDetectionStrategy, Component, computed, HostBinding, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdaptiveLayoutService } from '../../../../services/ui/adaptive-layout.service';
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

    constructor(
        private webTheme: WebThemeService,
        private adaptiveLayout: AdaptiveLayoutService
    ) { }

    isDisabled(option: ThemeOption): boolean {
        return option.id === 'wood' && !this.isDesktop();
    }

    select(option: ThemeOption): void {
        if (this.isDisabled(option)) return;
        this.webTheme.select(option.id);
    }
}
