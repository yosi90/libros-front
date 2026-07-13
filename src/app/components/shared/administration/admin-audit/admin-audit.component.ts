import { CommonModule, JsonPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminAuditQuery, AdminAuditRecord, AdminUsersCursor } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { getProductStateMessage } from '../../../../shared/api-error-message';

@Component({
    standalone: true,
    selector: 'app-admin-audit',
    imports: [CommonModule, FormsModule, JsonPipe, MatIconModule],
    templateUrl: './admin-audit.component.html',
    styleUrl: './admin-audit.component.sass'
})
export class AdminAuditComponent implements OnInit {
    records: AdminAuditRecord[] = [];
    filters: AdminAuditQuery = { limit: 25 };
    nextCursor: AdminUsersCursor | null = null;
    pageIndex = 0;
    isLoading = false;
    error = '';
    private cursorHistory: AdminUsersCursor[] = [];

    constructor(private users: UserService) { }

    ngOnInit(): void { this.load(); }

    applyFilters(): void {
        this.pageIndex = 0;
        this.cursorHistory = [];
        this.nextCursor = null;
        this.load();
    }

    clearFilters(): void {
        this.filters = { limit: 25 };
        this.applyFilters();
    }

    nextPage(): void {
        if (!this.nextCursor) return;
        this.cursorHistory.push(this.nextCursor);
        this.pageIndex++;
        this.load();
    }

    previousPage(): void {
        if (this.pageIndex === 0) return;
        this.cursorHistory.pop();
        this.pageIndex--;
        this.load();
    }

    label(record: AdminAuditRecord, ...keys: string[]): string {
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) return value;
            if (typeof value === 'number') return String(value);
        }
        return '—';
    }

    private load(): void {
        this.isLoading = true;
        this.error = '';
        const cursor = this.cursorHistory[this.cursorHistory.length - 1];
        const query: AdminAuditQuery = {
            ...this.filters,
            modulo: this.filters.modulo?.trim() || undefined,
            accion: this.filters.accion?.trim() || undefined,
            desde: this.toIso(this.filters.desde),
            hasta: this.toIso(this.filters.hasta),
            ...(cursor || {})
        };
        this.users.getAdminAudit(query).subscribe({
            next: response => {
                this.records = response.Registros;
                this.nextCursor = response.SiguienteCursor;
                this.isLoading = false;
            },
            error: error => {
                this.records = [];
                this.nextCursor = null;
                this.error = getProductStateMessage(error, 'No se ha podido cargar la auditoría.');
                this.isLoading = false;
            }
        });
    }

    private toIso(value: string | undefined): string | undefined {
        if (!value) return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toISOString();
    }
}
