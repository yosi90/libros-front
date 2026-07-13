import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminIncidentCursor, AdminRole, AdminUser, AdminUsersCursor, ModerationUser } from '../../../../interfaces/admin';
import { ModerationIncident } from '../../../../interfaces/moderation';
import { UserService } from '../../../../services/entities/user.service';
import { SessionService } from '../../../../services/auth/session.service';
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
    selectedUser: AdminUser | ModerationUser | null = null;
    incidents: ModerationIncident[] = [];
    nextIncidentCursor: AdminIncidentCursor | null = null;
    isDetailLoading = false;
    isLoadingMoreIncidents = false;
    detailError = '';
    roles: AdminRole[] = [];
    selectedRoleId: number | null = null;
    roleReason = '';
    isChangingRole = false;
    roleMessage = '';

    constructor(private userSrv: UserService, private session: SessionService) { }

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
        const request = this.isAdmin ? this.userSrv.getAdminUsers(query) : this.userSrv.getModerationUsers(query);
        request.subscribe({
            next: response => {
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

    openDetail(user: ManagedUser, statusMessage = ''): void {
        if (this.isDetailLoading) return;
        this.isDetailLoading = true;
        this.detailError = '';
        this.roleMessage = '';
        const request = this.isAdmin ? this.userSrv.getAdminUser(user.id, { incidentLimit: 20 }) : this.userSrv.getModerationUser(user.id, { incidentLimit: 20 });
        request.subscribe({
            next: response => {
                this.selectedUser = response.Usuario;
                this.incidents = response.Incidentes;
                this.nextIncidentCursor = response.SiguienteCursorIncidentes;
                this.selectedRoleId = response.Usuario.Rol.Id;
                this.roleReason = '';
                this.roleMessage = statusMessage;
                this.isDetailLoading = false;
            },
            error: error => {
                this.isDetailLoading = false;
                if (getApiErrorCode(error) === 'admin_user_not_found') {
                    this.closeDetail();
                    this.loadUsers();
                }
                this.detailError = getProductStateMessage(error, 'No se ha podido cargar la ficha de la cuenta.');
            }
        });
    }

    closeDetail(): void {
        this.selectedUser = null;
        this.incidents = [];
        this.nextIncidentCursor = null;
        this.selectedRoleId = null;
        this.roleReason = '';
        this.roleMessage = '';
        this.detailError = '';
    }

    loadMoreIncidents(): void {
        if (!this.selectedUser || !this.nextIncidentCursor || this.isLoadingMoreIncidents) return;
        this.isLoadingMoreIncidents = true;
        const query = { incidentLimit: 20, ...this.nextIncidentCursor };
        const request = this.isAdmin ? this.userSrv.getAdminUser(this.selectedUser.Id, query) : this.userSrv.getModerationUser(this.selectedUser.Id, query);
        request.subscribe({
            next: response => {
                const ids = new Set(this.incidents.map(incident => incident.Id));
                this.incidents = [...this.incidents, ...response.Incidentes.filter(incident => !ids.has(incident.Id))];
                this.nextIncidentCursor = response.SiguienteCursorIncidentes;
                this.isLoadingMoreIncidents = false;
            },
            error: error => {
                this.detailError = getProductStateMessage(error, 'No se han podido cargar más incidentes.');
                this.isLoadingMoreIncidents = false;
            }
        });
    }

    changeRole(): void {
        if (!this.isAdmin || !this.selectedUser || !this.selectedRoleId || !this.roleReason.trim() || this.isChangingRole || this.selectedUser.Id === this.session.userId) return;
        this.isChangingRole = true;
        this.roleMessage = '';
        this.userSrv.changeAdminUserRole(this.selectedUser.Id, this.selectedRoleId, this.roleReason.trim()).subscribe({
            next: () => {
                this.isChangingRole = false;
                const userId = this.selectedUser?.Id;
                this.loadUsers();
                if (userId) this.openDetail({ id: userId } as ManagedUser, 'Rol actualizado correctamente.');
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
                    const userId = this.selectedUser?.Id;
                    if (code === 'admin_role_not_found') this.loadRoles();
                    this.loadUsers();
                    if (userId) this.openDetail({ id: userId } as ManagedUser, message);
                }
            }
        });
    }

    get isOwnDetail(): boolean { return this.selectedUser?.Id === this.session.userId; }
    emailOf(user: AdminUser | ModerationUser): string { return 'Email' in user ? user.Email : ''; }

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

    private get currentCursor(): AdminUsersCursor | undefined {
        return this.cursorHistory[this.cursorHistory.length - 1];
    }

    private toManagedUser(user: AdminUser | ModerationUser): ManagedUser {
        const roleName = user.Rol?.Nombre ?? 'usuario';
        const accountState = user.EstadoCuenta?.Nombre ?? 'Activa';

        return {
            id: user.Id,
            name: user.DisplayName || user.Nombre,
            email: 'Email' in user ? user.Email : '',
            username: user.Username ?? null,
            role: roleName,
            accountState,
            emailVerified: user.EmailVerificado
        };
    }
}
