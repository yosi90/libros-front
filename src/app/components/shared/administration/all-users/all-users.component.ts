import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminUser, AdminUsersCursor, ModerationUser } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { SessionService } from '../../../../services/auth/session.service';

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
    imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
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
    loadError = false;

    constructor(private userSrv: UserService, private session: SessionService) { }

    get isAdmin(): boolean { return this.session.isAdmin; }

    ngOnInit(): void {
        this.loadUsers();
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
        this.loadError = false;

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
            error: () => {
                this.users = [];
                this.loadError = true;
                this.isLoading = false;
            }
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
