import { Component, OnInit } from '@angular/core';
import { User } from '../../../../interfaces/user';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Book } from '../../../../interfaces/book';
import { LoginService } from '../../../../services/auth/login.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatCard, MatCardContent, MatCardFooter } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { BookService } from '../../../../services/entities/book.service';
import { MatIcon } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';

@Component({
    selector: 'app-books',
    standalone: true,
    imports: [MatCard, MatCardContent, MatCardFooter, NgxDropzoneModule, CommonModule, MatTooltip, MatIcon, RouterLink, SnackbarModule],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {

    userData: User = {
        userId: -1,
        name: '',
        email: ''
    };

    constructor(private loginSrv: LoginService, private userSrv: UserService, private bookSrv: BookService, private router: Router, private _snackBar: SnackbarModule, private route: ActivatedRoute) {
        const token = this.loginSrv.token;
        if (token != null && token != '') {
            this.userSrv.getUser(token).subscribe({
                next: async (user) => {
                    this.userData = user;
                },
                error: () => {
                    this.loginSrv.logout();
                    this.router.navigateByUrl('/home');
                },
            });
        }
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            const authorAdded = params['authorAdded'];
            if (authorAdded === 'true')
                this._snackBar.openSnackBar('Autor añadido', 'successBar');
            const universeAdded = params['universeAdded'];
            if (universeAdded === 'true')
                this._snackBar.openSnackBar('Universo añadido', 'successBar');
            const sagaAdded = params['sagaAdded'];
            if (sagaAdded === 'true')
                this._snackBar.openSnackBar('Saga añadida', 'successBar');
            const bookAdded = params['bookAdded'];
            if (bookAdded === 'true')
                this._snackBar.openSnackBar('Libro añadido', 'successBar');
        });
    }

    openBook(bookId: number): void {
        this.router.navigate(['book', bookId]);
    }
}
