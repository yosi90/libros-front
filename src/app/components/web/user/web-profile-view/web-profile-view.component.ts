import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { revealActiveTab } from '../../ui/reveal-active-tab';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { getStatusClass } from '../../../../shared/reading-status';
import type { UserProfileComponent } from '../../../shared/user-pages/user-profile/user-profile.component';
import { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';
import { AppPreferencesComponent } from '../../../shared/user-pages/app-preferences/app-preferences.component';
import { ObjectManagerComponent } from '../../../shared/user-pages/object-manager/object-manager.component';
import { ProfileUniverseMetricsComponent } from '../../../shared/user-pages/user-profile/profile-universe-metrics/profile-universe-metrics.component';
import { YosiftwareMarkComponent } from '../../../shared/common/yosiftware-mark/yosiftware-mark.component';

/**
 * Vista Web del Perfil. El contenedor conserva datos, formularios y cargas;
 * los listados de la biblioteca se incrustan con el gestor en modo consulta.
 */
@Component({
    selector: 'app-web-profile-view',
    standalone: true,
    imports: [AsyncPipe, DatePipe, FormsModule, ReactiveFormsModule, MatIconModule, RouterLink, CoverCachePipe,
        ObjectManagerComponent, ProfileUniverseMetricsComponent,
        AccountSecurityComponent, AppPreferencesComponent, YosiftwareMarkComponent],
    templateUrl: './web-profile-view.component.html',
    styleUrl: './web-profile-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebProfileViewComponent implements AfterViewInit {
    @Input({ required: true }) controller!: UserProfileComponent;

    readonly mainSections = [
        { id: 'overview', label: 'Resumen', icon: 'dashboard' },
        { id: 'profile', label: 'Perfil', icon: 'account_circle' },
        { id: 'requests', label: 'Mis peticiones', icon: 'fact_check' },
        { id: 'reports', label: 'Mis reportes', icon: 'flag' }
    ] as const;

    constructor(private host: ElementRef<HTMLElement>) { }

    ngAfterViewInit(): void {
        this.revealActiveTab();
    }

    select(section: Parameters<UserProfileComponent['setActiveSection']>[0]): void {
        this.controller.setActiveSection(section);
        requestAnimationFrame(() => this.revealActiveTab());
    }

    private revealActiveTab(): void {
        revealActiveTab(this.host.nativeElement);
    }

    badge(section: string): number {
        if (section === 'requests') return this.controller.myRequests.length;
        if (section === 'reports') return this.controller.myReports.length;
        return 0;
    }

    /** Tono del estado de una petición o reporte: aceptado, rechazado, devuelto o pendiente. */
    requestTone(status: string): 'ok' | 'ko' | 'warn' | 'pending' {
        if (status === 'aprobada' || status === 'aceptado') return 'ok';
        if (status === 'rechazada' || status === 'rechazado') return 'ko';
        if (status === 'devuelta') return 'warn';
        return 'pending';
    }

    activityStatusKey(name: string): string {
        return getStatusClass(name);
    }
}
