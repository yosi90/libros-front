import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminAuditQuery, AdminAuditRecord, AdminUser, AdminUsersCursor } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { getProductStateMessage } from '../../../../shared/api-error-message';
import { catchError, forkJoin, map, of } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-admin-audit',
    imports: [CommonModule, FormsModule, MatIconModule],
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
    userSearch = '';
    userOptions: AdminUser[] = [];
    isSearchingUsers = false;
    private identityNames = new Map<number, string>();
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
        this.userSearch = '';
        this.userOptions = [];
        this.applyFilters();
    }

    searchUsers(): void {
        const query = this.userSearch.trim();
        if (query.length < 2 || this.isSearchingUsers) return;
        this.isSearchingUsers = true;
        this.users.getAdminUsers({ q: query, limit: 20 }).subscribe({
            next: response => { this.userOptions = response.Usuarios; this.isSearchingUsers = false; },
            error: () => { this.userOptions = []; this.isSearchingUsers = false; }
        });
    }

    userLabel(user: AdminUser): string { return user.DisplayName || user.Nombre; }

    personLabel(record: AdminAuditRecord, kind: 'actor' | 'target'): string {
        const keys = kind === 'actor'
            ? ['ActorNombre', 'actorNombre', 'UsuarioActorNombre', 'ActorDisplayName']
            : ['UsuarioObjetivoNombre', 'usuarioObjetivoNombre', 'TargetUserName', 'ObjetivoNombre'];
        const provided = this.label(record, ...keys);
        if (provided !== '—') return provided;
        const id = this.personId(record, kind);
        return id ? this.identityNames.get(id) || 'Persona no disponible' : 'Persona no disponible';
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
                this.resolveIdentityNames(response.Registros);
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

    private resolveIdentityNames(records: AdminAuditRecord[]): void {
        const ids = new Set<number>();
        records.forEach(record => {
            const actor = this.personId(record, 'actor');
            const target = this.personId(record, 'target');
            if (actor) ids.add(actor);
            if (target) ids.add(target);
        });
        const pending = [...ids].filter(id => !this.identityNames.has(id));
        if (!pending.length) return;
        forkJoin(pending.map(id => this.users.getAdminUser(id).pipe(
            map(response => ({ id, name: response.Usuario.DisplayName || response.Usuario.Nombre })),
            catchError(() => of({ id, name: 'Persona no disponible' }))
        ))).subscribe(items => items.forEach(item => this.identityNames.set(item.id, item.name)));
    }

    private personId(record: AdminAuditRecord, kind: 'actor' | 'target'): number | null {
        const keys = kind === 'actor' ? ['ActorId', 'actorId', 'UsuarioActorId'] : ['UsuarioObjetivoId', 'usuarioObjetivoId', 'TargetUserId'];
        for (const key of keys) {
            const value = record[key];
            if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
        }
        return null;
    }

    private toIso(value: string | undefined): string | undefined {
        if (!value) return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toISOString();
    }
}
