import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { ProfileUniverseMetricsComponent } from '../../../shared/user-pages/user-profile/profile-universe-metrics/profile-universe-metrics.component';
import type { UserProfileComponent } from '../../../shared/user-pages/user-profile/user-profile.component';

@Component({
    selector: 'app-mobile-profile-view',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, RouterLink, CoverCachePipe, ProfileUniverseMetricsComponent],
    templateUrl: './mobile-profile-view.component.html',
    styleUrl: './mobile-profile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileProfileViewComponent {
    @Input({ required: true }) controller!: UserProfileComponent;

    readonly mainSections = [
        { id: 'overview', label: 'Resumen', icon: 'dashboard' },
        { id: 'profile', label: 'Perfil', icon: 'account_circle' },
        { id: 'requests', label: 'Peticiones', icon: 'fact_check' },
        { id: 'policies', label: 'Normas', icon: 'policy' },
        { id: 'moderation', label: 'Moderación', icon: 'gavel' },
        { id: 'reports', label: 'Reportes', icon: 'flag' }
    ] as const;
}
