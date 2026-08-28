import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { ProfileActivityPreferencesComponent } from '../../../shared/user-pages/user-profile/preferences/profile-activity-preferences.component';
import { ProfileChatPreferencesComponent } from '../../../shared/user-pages/user-profile/preferences/profile-chat-preferences.component';
import { ProfileNotificationPreferencesComponent } from '../../../shared/user-pages/user-profile/preferences/profile-notification-preferences.component';
import { ProfilePrivacyPreferencesComponent } from '../../../shared/user-pages/user-profile/preferences/profile-privacy-preferences.component';
import { ProfileUniverseMetricsComponent } from '../../../shared/user-pages/user-profile/profile-universe-metrics/profile-universe-metrics.component';
import type { UserProfileComponent } from '../../../shared/user-pages/user-profile/user-profile.component';

@Component({
    selector: 'app-mobile-profile-view',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, RouterLink, CoverCachePipe, ProfileActivityPreferencesComponent, ProfileChatPreferencesComponent, ProfileNotificationPreferencesComponent, ProfilePrivacyPreferencesComponent, ProfileUniverseMetricsComponent],
    templateUrl: './mobile-profile-view.component.html',
    styleUrl: './mobile-profile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileProfileViewComponent {
    @Input({ required: true }) controller!: UserProfileComponent;

    readonly mainSections = [
        { id: 'overview', label: 'Resumen', icon: 'dashboard' },
        { id: 'profile', label: 'Perfil', icon: 'account_circle' },
        { id: 'preferences', label: 'Preferencias', icon: 'tune' },
        { id: 'security', label: 'Cuenta', icon: 'shield' },
        { id: 'requests', label: 'Peticiones', icon: 'fact_check' }
    ] as const;
}
