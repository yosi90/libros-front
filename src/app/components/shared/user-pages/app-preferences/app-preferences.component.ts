import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileUpdate } from '../../../../interfaces/user';
import { SessionService } from '../../../../services/auth/session.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { ProfileActivityPreferencesComponent } from '../user-profile/preferences/profile-activity-preferences.component';
import { ProfileChatPreferencesComponent } from '../user-profile/preferences/profile-chat-preferences.component';
import { ProfileNotificationPreferencesComponent } from '../user-profile/preferences/profile-notification-preferences.component';
import { ProfilePrivacyPreferencesComponent } from '../user-profile/preferences/profile-privacy-preferences.component';
import { MobileAppPermissionsComponent } from './mobile-app-permissions.component';
import { AppearancePreferencesComponent } from './appearance-preferences.component';

type PreferenceSection = 'appearance' | 'privacy' | 'activity' | 'notifications' | 'chat' | 'permissions';

@Component({
    selector: 'app-app-preferences',
    standalone: true,
    imports: [MatIconModule, RouterLink, ProfileActivityPreferencesComponent, ProfileChatPreferencesComponent, ProfileNotificationPreferencesComponent, ProfilePrivacyPreferencesComponent, MobileAppPermissionsComponent, AppearancePreferencesComponent],
    templateUrl: './app-preferences.component.html',
    styleUrls: ['../user-profile/user-profile.component.sass', './app-preferences.component.sass'],
    changeDetection: ChangeDetectionStrategy.Eager
})
export class AppPreferencesComponent {
    activeSection: PreferenceSection = 'privacy';
    privacyActivationToken = 0;
    privacySettings = this.currentPrivacySettings();
    readonly sections: ReadonlyArray<{ id: PreferenceSection; label: string; icon: string; description: string; nativeOnly?: boolean; webOnly?: boolean }> = [
        { id: 'appearance', label: 'Apariencia', icon: 'palette', description: 'Tema de la interfaz en este navegador.', webOnly: true },
        { id: 'privacy', label: 'Privacidad', icon: 'visibility', description: 'Qué pueden ver otras personas de tu perfil.' },
        { id: 'activity', label: 'Actividad lectora', icon: 'auto_stories', description: 'Qué cambios de tu biblioteca se comparten en Comunidad.' },
        { id: 'notifications', label: 'Notificaciones', icon: 'notifications', description: 'Qué avisos recibes, en la aplicación o como push.' },
        { id: 'chat', label: 'Chat', icon: 'forum', description: 'Cómo se comportan tus conversaciones.' },
        { id: 'permissions', label: 'Permisos del móvil', icon: 'app_settings_alt', description: 'Permisos del sistema para la aplicación.', nativeOnly: true }
    ];

    constructor(
        private session: SessionService,
        private presentation: PresentationModeService,
        route: ActivatedRoute
    ) {
        route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
            const section = params.get('section') ?? params.get('preference');
            if (this.isSection(section) && this.isAvailable(this.section(section))) this.activeSection = section;
        });
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get isNativeMobile(): boolean { return this.presentation.snapshot.isNativeMobile; }
    get user() { return this.session.userObject; }

    get isWebPresentation(): boolean { return this.presentation.snapshot.isWebPresentation; }
    /** Vista Web activa (no solo navegador): claro u oscuro con vista propia. */
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    get activeSectionInfo() { return this.section(this.activeSection); }

    availableSections() { return this.sections.filter(section => this.isAvailable(section)); }
    select(section: PreferenceSection): void { this.activeSection = section; }
    openPrivacy(): void { this.activeSection = 'privacy'; this.privacyActivationToken++; }
    consumePrivacyActivation(): void { this.privacyActivationToken = 0; }
    applyPrivacy(update: UserProfileUpdate): void {
        this.session.applyLocalProfileUpdate(update);
        this.privacySettings = this.currentPrivacySettings();
    }

    private currentPrivacySettings() {
        const user = this.session.userObject;
        return {
            perfilPublico: user.perfilPublico ?? false,
            mostrarEstadisticas: user.mostrarEstadisticas ?? false,
            mostrarBiblioteca: user.mostrarBiblioteca ?? false,
            permitirMensajes: user.permitirMensajes ?? false
        };
    }

    private isSection(value: string | null): value is PreferenceSection {
        return value === 'appearance' || value === 'privacy' || value === 'activity' || value === 'notifications' || value === 'chat' || value === 'permissions';
    }
    private section(id: PreferenceSection) { return this.sections.find(section => section.id === id)!; }
    private isAvailable(section: { nativeOnly?: boolean; webOnly?: boolean }): boolean {
        return (!section.nativeOnly || this.isNativeMobile) && (!section.webOnly || this.isWebPresentation);
    }
}
