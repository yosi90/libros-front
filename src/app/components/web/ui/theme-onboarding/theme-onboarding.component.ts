import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { WebThemeService } from '../../../../services/ui/web-theme.service';
import { ThemeWelcomeService } from '../../../../services/ui/theme-welcome.service';
import { AppToastService } from '../../../../shared/toast/app-toast.service';
import { AppearancePreferencesComponent } from '../../../shared/user-pages/app-preferences/appearance-preferences.component';

const themeNames: Record<string, string> = { light: 'Claro', dark: 'Oscuro', wood: 'Wood' };

/**
 * Bienvenida de estilo: la primera vez que una cuenta nueva llega a la Biblioteca
 * elige entre Claro, Oscuro y Wood viendo el cambio al momento. Solo en navegador.
 * Cuándo se muestra lo decide `ThemeWelcomeService`.
 */
@Component({
    selector: 'app-theme-onboarding',
    standalone: true,
    imports: [A11yModule, MatIconModule, AppearancePreferencesComponent],
    templateUrl: './theme-onboarding.component.html',
    styleUrl: './theme-onboarding.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeOnboardingComponent {
    private readonly webTheme = inject(WebThemeService);
    private readonly welcome = inject(ThemeWelcomeService);
    private readonly router = inject(Router);
    private readonly toasts = inject(AppToastService);

    readonly choiceName = computed(() => themeNames[this.webTheme.choice()] ?? '');
    readonly visible = this.welcome.visible;

    confirm(): void {
        this.welcome.complete();
        this.toasts.showInfo('Puedes cambiar el estilo cuando quieras en Perfil › Preferencias › Apariencia.', {
            title: `Estilo ${this.choiceName()} aplicado`,
            icon: 'palette',
            durationMs: 9000,
            dedupeKey: 'theme-onboarding',
            action: {
                label: 'Ir a Apariencia',
                execute: () => this.router.navigate(['/dashboard/profile'], { queryParams: { section: 'preferences', tab: 'appearance' } })
            }
        });
    }
}
