import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
import { User } from '../../../../interfaces/user';

@Component({
    standalone: true,
    selector:  'app-all-users',
    imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, CommonModule, FormsModule, MatCheckboxModule],
    templateUrl: './all-users.component.html',
    styleUrl: './all-users.component.sass'
})
export class AllUsersComponent {
    displayedColumns: string[] = ['userId', 'name', 'email', 'books', 'isAdmin'];
    dataSource!: MatTableDataSource<User>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(private sessionSrv: SessionService, private userSrv: UserService, private route: ActivatedRoute, private router: Router) {
        this.route.params.subscribe(() => {
            this.userSrv.getAllUsers().subscribe({
                next: async (users: User[]) => {
                    this.dataSource = new MatTableDataSource(users);
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                },
                error: () => {
                    this.sessionSrv.logout();
                },
            });
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    preventChange(event: Event) {
        event.preventDefault();
    }
}
