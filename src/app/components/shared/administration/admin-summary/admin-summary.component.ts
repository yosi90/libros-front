import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminSummary } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';

export type AdminSummaryTarget = 'catalogRequests' | 'reviewReports' | 'moderation';

interface DonutSlice { label: string; value: number; color: string; target?: AdminSummaryTarget; }

@Component({
    standalone: true,
    selector: 'app-admin-summary',
    imports: [CommonModule, MatIconModule],
    templateUrl: './admin-summary.component.html',
    styleUrl: './admin-summary.component.sass'
})
export class AdminSummaryComponent implements OnInit {
    @Output() navigate = new EventEmitter<AdminSummaryTarget>();
    summary: AdminSummary | null = null;
    isLoading = true;
    hasError = false;

    constructor(private userService: UserService) { }

    ngOnInit(): void { this.load(); }

    get accountStateSlices(): DonutSlice[] { return this.summary?.Cuentas.PorEstado.map((item, index) => ({ label: item.Nombre, value: item.Total, color: this.colorAt(index) })) ?? []; }
    get accountRoleSlices(): DonutSlice[] { return this.summary?.Cuentas.PorRol.map((item, index) => ({ label: item.Nombre, value: item.Total, color: this.colorAt(index + 3) })) ?? []; }
    get verificationSlices(): DonutSlice[] {
        const total = this.total(this.accountStateSlices);
        const pending = this.summary?.Cuentas.EmailPendienteVerificacion ?? 0;
        return [{ label: 'Verificadas', value: Math.max(0, total - pending), color: '#78bfab' }, { label: 'Pendientes', value: pending, color: '#d9a956' }];
    }
    get queueSlices(): DonutSlice[] {
        if (!this.summary) return [];
        return [
            { label: 'Peticiones', value: this.summary.Colas.PeticionesCatalogo, color: '#d9a956', target: 'catalogRequests' },
            { label: 'Reportes', value: this.summary.Colas.ReportesResenas, color: '#78bfab', target: 'reviewReports' },
            { label: 'Denuncias', value: this.summary.Colas.DenunciasComunidad, color: '#7ca9d9', target: 'moderation' },
            { label: 'Alegaciones', value: this.summary.Colas.Alegaciones, color: '#bd83b8', target: 'moderation' }
        ];
    }
    donutBackground(slices: DonutSlice[]): string {
        const total = this.total(slices);
        if (!total) return 'conic-gradient(rgba(218, 166, 91, .16) 0 100%)';
        let current = 0;
        return `conic-gradient(${slices.map(slice => { const start = current; current += slice.value / total * 100; return `${slice.color} ${start}% ${current}%`; }).join(', ')})`;
    }
    total(slices: DonutSlice[]): number { return slices.reduce((sum, slice) => sum + slice.value, 0); }
    openQueue(slice: DonutSlice): void { if (slice.target) this.navigate.emit(slice.target); }

    load(): void {
        this.isLoading = true;
        this.hasError = false;
        this.userService.getAdminSummary().subscribe({
            next: summary => {
                this.summary = summary;
                this.isLoading = false;
            },
            error: () => {
                this.summary = null;
                this.hasError = true;
                this.isLoading = false;
            }
        });
    }

    private colorAt(index: number): string { return ['#d9a956', '#78bfab', '#7ca9d9', '#bd83b8', '#d98566', '#b8c478'][index % 6]; }
}
