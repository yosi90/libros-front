import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { Role, User } from '../../../../interfaces/user';
import { UserService } from '../../../../services/entities/user.service';

type ManagedRole = 'usuario' | 'moderador' | 'administrador';

interface ManagedUser {
    id: number;
    name: string;
    email: string;
    books: number;
    role: ManagedRole;
    accountState: string;
    isBanned: boolean;
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
    isLoading = true;
    loadError = false;

    constructor(
        private userSrv: UserService,
        private snackBar: SnackbarModule
    ) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    get filteredUsers(): ManagedUser[] {
        const search = this.search.trim().toLocaleLowerCase();
        if (!search)
            return this.users;

        return this.users.filter(user => [user.id, user.name, user.email, user.role, user.accountState]
            .some(value => String(value).toLocaleLowerCase().includes(search)));
    }

    get visibleUsers(): ManagedUser[] {
        const start = this.pageIndex * this.pageSize;
        return this.filteredUsers.slice(start, start + this.pageSize);
    }

    get totalPages(): number {
        return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
    }

    get firstVisibleItem(): number {
        return this.filteredUsers.length ? this.pageIndex * this.pageSize + 1 : 0;
    }

    get lastVisibleItem(): number {
        return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredUsers.length);
    }

    get showPagination(): boolean {
        return this.filteredUsers.length > this.pageSize;
    }

    loadUsers(): void {
        this.isLoading = true;
        this.loadError = false;

        this.userSrv.getAllUsers().subscribe({
            next: users => {
                this.users = users.map(user => this.toManagedUser(user));
                this.ensureValidPage();
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
    }

    updatePageSize(pageSize: number): void {
        this.pageSize = Number(pageSize);
        this.pageIndex = 0;
    }

    previousPage(): void {
        this.pageIndex = Math.max(0, this.pageIndex - 1);
    }

    nextPage(): void {
        this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1);
    }

    toggleBan(user: ManagedUser): void {
        user.isBanned = !user.isBanned;
        user.accountState = user.isBanned ? 'Baneada' : 'Activa';
        this.snackBar.openSnackBar(
            user.isBanned
                ? 'Baneo aplicado solo en esta sesión hasta conectar el servicio'
                : 'Cuenta reactivada solo en esta sesión hasta conectar el servicio',
            'successBar'
        );
    }

    requestRoleChange(user: ManagedUser, event: Event): void {
        const role = (event.target as HTMLSelectElement).value as ManagedRole;
        if (role === user.role)
            return;

        this.snackBar.openSnackBar(
            `El cambio a ${this.roleLabel(role)} se habilitará al conectar el servicio`,
            'errorBar'
        );
    }

    roleLabel(role: ManagedRole): string {
        return role.charAt(0).toUpperCase() + role.slice(1);
    }

    private ensureValidPage(): void {
        this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1);
    }

    private toManagedUser(user: User): ManagedUser {
        const rawRole = user.role as Role | string | undefined;
        const roleName = typeof rawRole === 'string' ? rawRole : rawRole?.Nombre;
        const accountState = user.estadoCuenta?.Nombre ?? 'Activa';

        return {
            id: user.userId,
            name: user.name,
            email: user.email,
            books: user.books?.length ?? 0,
            role: this.normalizeRole(roleName),
            accountState,
            isBanned: accountState.toLocaleLowerCase().includes('bane')
        };
    }

    private normalizeRole(role: string | undefined): ManagedRole {
        if (role === 'administrador' || role === 'moderador')
            return role;

        return 'usuario';
    }
}
