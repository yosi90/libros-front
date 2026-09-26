import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SessionService } from '../../../../services/auth/session.service';
import { WebThemeService } from '../../../../services/ui/web-theme.service';
import { AppToastService } from '../../../../shared/toast/app-toast.service';
import { AppearancePreferencesComponent } from '../../../shared/user-pages/app-preferences/appearance-preferences.component';

const ONBOARDED_PREFIX = 'libros:theme-onboarded:';
const LIBRARY_PATH = '/dashboard/books';

const themeNames: Record<string, string> = { light: 'Claro', dark: 'Oscuro', wood: 'Wood' };

/**
 * Bienvenida de estilo: la primera vez que una cuenta nueva llega a la Biblioteca
 * elige entre Claro, Oscuro y Wood viendo el cambio al momento. Solo en navegador.
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
    private readonly session = inject(SessionService);
    private readonly router = inject(Router);
    private readonly toasts = inject(AppToastService);

    private readonly url = signal(this.router.url);
    private readonly dismissed = signal(false);

    readonly choiceName = computed(() => themeNames[this.webTheme.choice()] ?? '');

    /** Cuenta nueva, en la Biblioteca y sin haber pasado ya por esta bienvenida en el dispositivo. */
    readonly visible = computed(() =>
        this.webTheme.enabled
        && this.webTheme.accountUnset() === true
        && !this.dismissed()
        && this.url().split('?')[0] === LIBRARY_PATH
        && !this.alreadyOnboarded());

    constructor() {
        this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(event => this.url.set((event as NavigationEnd).urlAfterRedirects));
    }

    confirm(): void {
        this.markOnboarded();
        this.dismissed.set(true);
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

    private alreadyOnboarded(): boolean {
        try { return localStorage.getItem(ONBOARDED_PREFIX + this.session.userId) === '1'; }
        catch { return false; }
    }

    private markOnboarded(): void {
        try { localStorage.setItem(ONBOARDED_PREFIX + this.session.userId, '1'); }
        catch { /* Navegación privada: basta con cerrarla en esta sesión. */ }
    }
}
