import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import type { UserProfileComponent } from '../../../shared/user-pages/user-profile/user-profile.component';

@Component({
    selector: 'app-mobile-profile-view',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, RouterLink, CoverCachePipe],
    templateUrl: './mobile-profile-view.component.html',
    styleUrl: './mobile-profile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileProfileViewComponent {
    @Input({ required: true }) controller!: UserProfileComponent;

    readonly mainSections = [
        { id: 'profile', label: 'Identidad pública', supporting: 'Alias, nombre, biografía y país', icon: 'account_circle' },
        { id: 'requests', label: 'Mis peticiones', supporting: 'Consulta el estado de tus solicitudes', icon: 'fact_check' },
        { id: 'reports', label: 'Mis reportes', supporting: 'Revisa el contenido que has denunciado', icon: 'flag' }
    ] as const;
}
