
import { Component, EventEmitter, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminSummary } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { ApiHealth, ApiHealthComponent, ApiHealthService } from '../../../../services/other/api-health.service';

export type AdminSummaryTarget = 'catalogRequests' | 'reviewReports' | 'communityReports';

interface DonutSlice { label: string; value: number; color: string; target?: AdminSummaryTarget; }
interface HealthCard { id: string; label: string; component: ApiHealthComponent; }

@Component({
    standalone: true,
    selector: 'app-admin-summary',
    imports: [MatIconModule],
    templateUrl: './admin-summary.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './admin-summary.component.sass'
})
export class AdminSummaryComponent implements OnInit {
    @Output() navigate = new EventEmitter<AdminSummaryTarget>();
    summary: AdminSummary | null = null;
    accountStateSlices: DonutSlice[] = [];
    accountRoleSlices: DonutSlice[] = [];
    queueSlices: DonutSlice[] = [];
    isLoading = false;
    hasError = false;
    health: ApiHealth | null = null;
    healthCards: HealthCard[] = [];

    constructor(private userService: UserService, private apiHealth: ApiHealthService) { }

    ngOnInit(): void { this.refresh(); }

    trackSlice(_index: number, slice: DonutSlice): string { return slice.label; }
    donutBackground(slices: DonutSlice[]): string {
        const total = this.total(slices);
        if (!total) return 'conic-gradient(rgba(218, 166, 91, .16) 0 100%)';
        let current = 0;
        return `conic-gradient(${slices.map(slice => { const start = current; current += slice.value / total * 100; return `${slice.color} ${start}% ${current}%`; }).join(', ')})`;
    }
    total(slices: DonutSlice[]): number { return slices.reduce((sum, slice) => sum + slice.value, 0); }
    openQueue(slice: DonutSlice): void { if (slice.target) this.navigate.emit(slice.target); }
    trackHealth(_index: number, card: HealthCard): string { return card.id; }
    healthStateLabel(component: ApiHealthComponent): string {
        return ({
            checking: 'Comprobando',
            healthy: 'Saludable',
            degraded: 'Degradado',
            unavailable: 'No disponible',
            unknown: 'Sin datos'
        } as const)[component.state];
    }
    refresh(): void { this.load(); this.loadHealth(); }

    load(): void {
        if (this.isLoading) return;
        this.isLoading = true;
        this.hasError = false;
        this.userService.getAdminSummary().subscribe({
            next: summary => {
                this.summary = summary;
                this.buildSlices(summary);
                this.isLoading = false;
            },
            error: () => {
                this.summary = null;
                this.clearSlices();
                this.hasError = true;
                this.isLoading = false;
            }
        });
    }

    private loadHealth(): void {
        this.apiHealth.check().subscribe(health => {
            this.health = health;
            this.healthCards = [
                { id: 'api', label: 'API', component: health.components.api },
                { id: 'sqlServer', label: 'SQL Server', component: health.components.sqlServer },
                { id: 'plataformaFeedWorker', label: 'Feed de la plataforma', component: health.components.plataformaFeedWorker }
            ];
        });
    }

    private buildSlices(summary: AdminSummary): void {
        this.accountStateSlices = summary.Cuentas.PorEstado.map((item, index) => ({ label: item.Nombre, value: item.Total, color: this.colorAt(index) }));
        this.accountRoleSlices = summary.Cuentas.PorRol.map((item, index) => ({ label: item.Nombre, value: item.Total, color: this.colorAt(index + 3) }));
        this.queueSlices = [
            { label: 'Peticiones', value: summary.Colas.PeticionesCatalogo, color: '#d9a956', target: 'catalogRequests' },
            { label: 'Reportes', value: summary.Colas.ReportesResenas, color: '#78bfab', target: 'reviewReports' },
            { label: 'Denuncias', value: summary.Colas.DenunciasComunidad, color: '#7ca9d9', target: 'communityReports' }
        ];
    }

    private clearSlices(): void {
        this.accountStateSlices = [];
        this.accountRoleSlices = [];
        this.queueSlices = [];
    }

    private colorAt(index: number): string { return ['#d9a956', '#78bfab', '#7ca9d9', '#bd83b8', '#d98566', '#b8c478'][index % 6]; }
}
