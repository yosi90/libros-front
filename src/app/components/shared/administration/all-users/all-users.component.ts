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
import { Book } from '../../../../interfaces/book';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
import { User } from '../../../../interfaces/user';

@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, CommonModule, FormsModule, MatCheckboxModule],
  templateUrl: './all-users.component.html',
  styleUrl: './all-users.component.sass'
})
export class AllUsersComponent {
  displayedColumns: string[] = ['userId', 'name', 'email', 'books', 'isAdmin'];
  dataSource!: MatTableDataSource<User>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private loginSrv: SessionService, private userSrv: UserService, private route: ActivatedRoute, private router: Router) {
      this.route.params.subscribe(() => {
          const token = this.loginSrv.token;
          if (token != null && token != '') {
              this.userSrv.getAllUsers(token).subscribe({
                  next: async (users: User[]) => {
                      users.forEach((user) => {
                        if(user.roles?.some(rol => rol.name === 'ADMIN') === true) {
                            user.isAdmin = true
                        } else {
                            user.isAdmin = false;
                        }
                      });
                      this.dataSource = new MatTableDataSource(users);
                      this.dataSource.paginator = this.paginator;
                      this.dataSource.sort = this.sort;
                  },
                  error: () => {
                      this.loginSrv.logout();
                      this.router.navigateByUrl('/home');
                  },
              });
          }
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
