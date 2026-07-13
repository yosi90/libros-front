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
    accountStateSlices: DonutSlice[] = [];
    accountRoleSlices: DonutSlice[] = [];
    verificationSlices: DonutSlice[] = [];
    queueSlices: DonutSlice[] = [];
    isLoading = false;
    hasError = false;

    constructor(private userService: UserService) { }

    ngOnInit(): void { this.load(); }

    trackSlice(_index: number, slice: DonutSlice): string { return slice.label; }
    donutBackground(slices: DonutSlice[]): string {
        const total = this.total(slices);
        if (!total) return 'conic-gradient(rgba(218, 166, 91, .16) 0 100%)';
        let current = 0;
        return `conic-gradient(${slices.map(slice => { const start = current; current += slice.value / total * 100; return `${slice.color} ${start}% ${current}%`; }).join(', ')})`;
    }
    total(slices: DonutSlice[]): number { return slices.reduce((sum, slice) => sum + slice.value, 0); }
    openQueue(slice: DonutSlice): void { if (slice.target) this.navigate.emit(slice.target); }

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

    private buildSlices(summary: AdminSummary): void {
        this.accountStateSlices = summary.Cuentas.PorEstado.map((item, index) => ({ label: item.Nombre, value: item.Total, color: this.colorAt(index) }));
        this.accountRoleSlices = summary.Cuentas.PorRol.map((item, index) => ({ label: item.Nombre, value: item.Total, color: this.colorAt(index + 3) }));
        const totalAccounts = this.total(this.accountStateSlices);
        const pending = summary.Cuentas.EmailPendienteVerificacion;
        this.verificationSlices = [{ label: 'Verificadas', value: Math.max(0, totalAccounts - pending), color: '#78bfab' }, { label: 'Pendientes', value: pending, color: '#d9a956' }];
        this.queueSlices = [
            { label: 'Peticiones', value: summary.Colas.PeticionesCatalogo, color: '#d9a956', target: 'catalogRequests' },
            { label: 'Reportes', value: summary.Colas.ReportesResenas, color: '#78bfab', target: 'reviewReports' },
            { label: 'Denuncias', value: summary.Colas.DenunciasComunidad, color: '#7ca9d9', target: 'moderation' },
            { label: 'Alegaciones', value: summary.Colas.Alegaciones, color: '#bd83b8', target: 'moderation' }
        ];
    }

    private clearSlices(): void {
        this.accountStateSlices = [];
        this.accountRoleSlices = [];
        this.verificationSlices = [];
        this.queueSlices = [];
    }

    private colorAt(index: number): string { return ['#d9a956', '#78bfab', '#7ca9d9', '#bd83b8', '#d98566', '#b8c478'][index % 6]; }
}
