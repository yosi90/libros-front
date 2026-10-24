import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminRole, AdminUser, AdminUsersCursor } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { getApiErrorCode, getProductStateMessage } from '../../../../shared/api-error-message';

interface ManagedUser {
    id: number;
    name: string;
    email: string;
    username: string | null;
    role: string;
    accountState: string;
    emailVerified: boolean;
}

@Component({
    standalone: true,
    selector: 'app-all-users',
    imports: [CommonModule, DatePipe, FormsModule, MatIconModule, MatTooltipModule],
    templateUrl: './all-users.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './all-users.component.sass'
})
export class AllUsersComponent implements OnInit {
    readonly pageSizeOptions = [10, 25, 50];
    users: ManagedUser[] = [];
    search = '';
    pageSize = 10;
    pageIndex = 0;
    nextCursor: AdminUsersCursor | null = null;
    isLoading = true;
    loadError = '';
    selectedUser: AdminUser | null = null;
    isDetailLoading = false;
    detailError = '';
    roles: AdminRole[] = [];
    selectedRoleId: number | null = null;
    roleReason = '';
    isChangingRole = false;
    roleMessage = '';

    constructor(private userSrv: UserService, private session: PlatformSessionService) { }

    get isAdmin(): boolean { return this.session.isAdmin; }

    ngOnInit(): void {
        this.loadUsers();
        if (this.isAdmin)
            this.loadRoles();
    }

    get visibleUsers(): ManagedUser[] {
        return this.users;
    }

    get firstVisibleItem(): number {
        return this.users.length ? this.pageIndex * this.pageSize + 1 : 0;
    }

    get lastVisibleItem(): number {
        return this.pageIndex * this.pageSize + this.users.length;
    }

    get showPagination(): boolean {
        return this.pageIndex > 0 || this.nextCursor !== null;
    }

    loadUsers(): void {
        this.isLoading = true;
        this.loadError = '';

        const query = {
            q: this.search.trim() || undefined,
            limit: this.pageSize,
            ...this.currentCursor
        };
        // La gestión de cuentas es de la plataforma: aquí solo quedan los roles de Libros, que cambia la administración.
        if (!this.isAdmin) {
            this.users = [];
            this.isLoading = false;
            this.loadError = 'La gestión de cuentas es de la plataforma Yosiftware.';
            return;
        }
        this.userSrv.getAdminUsers(query).subscribe({
            next: response => {
                this.rows = new Map(response.Usuarios.map(user => [user.Id, user]));
                this.users = response.Usuarios.map(user => this.toManagedUser(user));
                this.nextCursor = response.SiguienteCursor;
                this.isLoading = false;
            },
            error: error => {
                this.users = [];
                this.loadError = getProductStateMessage(error, 'No se pudieron cargar los usuarios. Inténtalo de nuevo.');
                this.isLoading = false;
            }
        });
    }

    /** La ficha es la fila del listado: la ficha completa (`/admin/usuarios/{id}`) se retiró con la adhesión. */
    openDetail(user: ManagedUser, statusMessage = ''): void {
        const row = this.rows.get(user.id);
        this.detailError = row ? '' : 'Esta cuenta ya no está en el listado.';
        this.selectedUser = row ?? null;
        this.selectedRoleId = row?.Rol.Id ?? null;
        this.roleReason = '';
        this.roleMessage = statusMessage;
    }

    closeDetail(): void {
        this.selectedUser = null;
        this.selectedRoleId = null;
        this.roleReason = '';
        this.roleMessage = '';
        this.detailError = '';
    }

    changeRole(): void {
        if (!this.isAdmin || !this.selectedUser || !this.selectedRoleId || !this.roleReason.trim() || this.isChangingRole || this.selectedUser.Id === this.session.userId) return;
        this.isChangingRole = true;
        this.roleMessage = '';
        this.userSrv.changeAdminUserRole(this.selectedUser.Id, this.selectedRoleId, this.roleReason.trim()).subscribe({
            next: () => {
                this.isChangingRole = false;
                this.closeDetail();
                this.roleMessage = 'Rol actualizado correctamente.';
                this.loadUsers();
            },
            error: error => {
                this.isChangingRole = false;
                const code = getApiErrorCode(error);
                const message = getProductStateMessage(error, 'No se ha podido cambiar el rol.');
                this.roleMessage = message;
                if (code === 'admin_user_not_found') {
                    this.closeDetail();
                    this.loadUsers();
                } else if (code === 'admin_role_self_change_forbidden' || code === 'last_active_admin_required' || code === 'admin_role_not_found') {
                    if (code === 'admin_role_not_found') this.loadRoles();
                    this.loadUsers();
                }
            }
        });
    }

    get isOwnDetail(): boolean { return this.selectedUser?.Id === this.session.userId; }
    emailOf(user: AdminUser): string { return user.Email ?? ''; }

    private loadRoles(): void {
        this.userSrv.getAdminRoles().subscribe({
            next: roles => this.roles = roles,
            error: () => this.roles = []
        });
    }

    updateSearch(): void {
        this.pageIndex = 0;
        this.cursorHistory = [];
        this.nextCursor = null;
        this.loadUsers();
    }

    updatePageSize(pageSize: number): void {
        this.pageSize = Number(pageSize);
        this.pageIndex = 0;
        this.cursorHistory = [];
        this.nextCursor = null;
        this.loadUsers();
    }

    previousPage(): void {
        if (this.pageIndex === 0)
            return;
        this.pageIndex--;
        this.cursorHistory.pop();
        this.loadUsers();
    }

    nextPage(): void {
        if (!this.nextCursor)
            return;
        this.cursorHistory.push(this.nextCursor);
        this.pageIndex++;
        this.loadUsers();
    }

    private cursorHistory: AdminUsersCursor[] = [];
    private rows = new Map<number, AdminUser>();

    private get currentCursor(): AdminUsersCursor | undefined {
        return this.cursorHistory[this.cursorHistory.length - 1];
    }

    private toManagedUser(user: AdminUser): ManagedUser {
        const roleName = user.Rol?.Nombre ?? 'usuario';
        const accountState = user.EstadoCuenta?.Nombre ?? 'Activa';

        return {
            id: user.Id,
            name: user.DisplayName || user.Nombre,
            email: user.Email ?? '',
            username: user.Username ?? null,
            role: roleName,
            accountState,
            emailVerified: user.EmailVerificado
        };
    }
}
