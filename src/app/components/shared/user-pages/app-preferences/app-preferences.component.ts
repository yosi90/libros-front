import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { ProfileChatPreferencesComponent } from '../user-profile/preferences/profile-chat-preferences.component';
import { ProfilePlatformPrivacyComponent } from '../user-profile/preferences/profile-platform-privacy.component';
import { MobileAppPermissionsComponent } from './mobile-app-permissions.component';
import { AppearancePreferencesComponent } from './appearance-preferences.component';

type PreferenceSection = 'appearance' | 'privacy' | 'chat' | 'permissions';

@Component({
    selector: 'app-app-preferences',
    standalone: true,
    imports: [MatIconModule, ProfileChatPreferencesComponent, ProfilePlatformPrivacyComponent, MobileAppPermissionsComponent, AppearancePreferencesComponent],
    templateUrl: './app-preferences.component.html',
    styleUrl: './app-preferences.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class AppPreferencesComponent {
    activeSection: PreferenceSection = 'privacy';
    readonly sections: ReadonlyArray<{ id: PreferenceSection; label: string; icon: string; description: string; nativeOnly?: boolean; webOnly?: boolean }> = [
        { id: 'appearance', label: 'Apariencia', icon: 'palette', description: 'Tema de la interfaz en este navegador.', webOnly: true },
        { id: 'privacy', label: 'Privacidad', icon: 'visibility', description: 'Tu privacidad en Libros es la de tu cuenta de Yosiftware.' },
        { id: 'chat', label: 'Chat', icon: 'forum', description: 'Cómo se comportan tus ventanas de chat en este escritorio.' },
        { id: 'permissions', label: 'Permisos del móvil', icon: 'app_settings_alt', description: 'Permisos del sistema para la aplicación.', nativeOnly: true }
    ];

    constructor(
        private presentation: PresentationModeService,
        route: ActivatedRoute
    ) {
        route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
            // Dentro del Perfil el apartado llega en `tab`; en la ruta propia (APK), en `section`.
            const section = params.get('tab') ?? params.get('section') ?? params.get('preference');
            if (this.isSection(section) && this.isAvailable(this.section(section))) this.activeSection = section;
        });
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get isNativeMobile(): boolean { return this.presentation.snapshot.isNativeMobile; }

    get isWebPresentation(): boolean { return this.presentation.snapshot.isWebPresentation; }
    /** Vista Web activa (no solo navegador): claro u oscuro con vista propia. */
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    get activeSectionInfo() { return this.section(this.activeSection); }

    availableSections() { return this.sections.filter(section => this.isAvailable(section)); }
    select(section: PreferenceSection): void { this.activeSection = section; }
    private isSection(value: string | null): value is PreferenceSection {
        return value === 'appearance' || value === 'privacy' || value === 'chat' || value === 'permissions';
    }
    private section(id: PreferenceSection) { return this.sections.find(section => section.id === id)!; }
    private isAvailable(section: { nativeOnly?: boolean; webOnly?: boolean }): boolean {
        return (!section.nativeOnly || this.isNativeMobile) && (!section.webOnly || this.isWebPresentation);
    }
}
