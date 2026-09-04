import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileUpdate } from '../../../../interfaces/user';
import { SessionService } from '../../../../services/auth/session.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { ProfileActivityPreferencesComponent } from '../user-profile/preferences/profile-activity-preferences.component';
import { ProfileChatPreferencesComponent } from '../user-profile/preferences/profile-chat-preferences.component';
import { ProfileNotificationPreferencesComponent } from '../user-profile/preferences/profile-notification-preferences.component';
import { ProfilePrivacyPreferencesComponent } from '../user-profile/preferences/profile-privacy-preferences.component';
import { MobileAppPermissionsComponent } from './mobile-app-permissions.component';

type PreferenceSection = 'privacy' | 'activity' | 'notifications' | 'chat' | 'permissions';

@Component({
    selector: 'app-app-preferences',
    standalone: true,
    imports: [MatIconModule, ProfileActivityPreferencesComponent, ProfileChatPreferencesComponent, ProfileNotificationPreferencesComponent, ProfilePrivacyPreferencesComponent, MobileAppPermissionsComponent],
    templateUrl: './app-preferences.component.html',
    styleUrls: ['../user-profile/user-profile.component.sass', '../../../mobile/user/mobile-profile-view/mobile-profile-view.component.sass'],
    changeDetection: ChangeDetectionStrategy.Eager
})
export class AppPreferencesComponent {
    activeSection: PreferenceSection = 'privacy';
    privacyActivationToken = 0;
    privacySettings = this.currentPrivacySettings();
    readonly sections: ReadonlyArray<{ id: PreferenceSection; label: string; icon: string; nativeOnly?: boolean }> = [
        { id: 'privacy', label: 'Privacidad', icon: 'visibility' },
        { id: 'activity', label: 'Actividad lectora', icon: 'auto_stories' },
        { id: 'notifications', label: 'Notificaciones', icon: 'notifications' },
        { id: 'chat', label: 'Chat', icon: 'forum' },
        { id: 'permissions', label: 'Permisos del móvil', icon: 'app_settings_alt', nativeOnly: true }
    ];

    constructor(
        private session: SessionService,
        private presentation: PresentationModeService,
        route: ActivatedRoute
    ) {
        route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
            const section = params.get('section') ?? params.get('preference');
            if (this.isSection(section) && (!this.section(section).nativeOnly || this.isNativeMobile)) this.activeSection = section;
        });
    }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get isNativeMobile(): boolean { return this.presentation.snapshot.isNativeMobile; }
    get user() { return this.session.userObject; }

    availableSections() { return this.sections.filter(section => !section.nativeOnly || this.isNativeMobile); }
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
        return value === 'privacy' || value === 'activity' || value === 'notifications' || value === 'chat' || value === 'permissions';
    }
    private section(id: PreferenceSection) { return this.sections.find(section => section.id === id)!; }
}
