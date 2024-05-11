import { Component, OnInit } from '@angular/core';
import { User } from '../../../../interfaces/user';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneChangeEvent, NgxDropzoneModule } from 'ngx-dropzone';
import { Book } from '../../../../interfaces/book';
import { LoginService } from '../../../../services/auth/login.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatCard, MatCardContent, MatCardFooter } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { BookService } from '../../../../services/entities/book.service';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'app-books',
    standalone: true,
    imports: [MatCard, MatCardContent, MatCardFooter, NgxDropzoneModule, CommonModule, MatTooltip, MatIcon, RouterLink],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {

    userData: User = {
        userId: -1,
        name: '',
        email: ''
    };

    constructor(private loginSrv: LoginService, private userSrv: UserService, private bookSrv: BookService, private router: Router, private _snackBar: MatSnackBar, private route: ActivatedRoute) {
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
                this.openSnackBar('Autor añadido', 'successBar');
            const universerAdded = params['universeAdded'];
            if (universerAdded === 'true')
                this.openSnackBar('Universo añadido', 'successBar');
            const sagaAdded = params['sagaAdded'];
            if (universerAdded === 'true')
                this.openSnackBar('Saga añadida', 'successBar');
            const bookAddeddded = params['bookAdded'];
            if (universerAdded === 'true')
                this.openSnackBar('Libro añadido', 'successBar');
        });
    }

    openBook(bookId: number): void {
        this.router.navigate(['book', bookId]);
    }

    generateTooltip(book: Book): string {
        return `${book.name}

        ${book.status.statusId === 1 ? 'Un no comprado' : book.status.statusId === 2 ? 'En espera a ser leido' : book.status.statusId === 3 ? '¡Lectura actual!' : 'Leido :('}

        por ${book.authors.map(a => a.name).join(' y ')}
        Capítulos: ${book.chapters.length}
        Personajes: ${book.characters.length}`
    }
    
    openSnackBar(errorString: string, cssClass: string) {
        this._snackBar.open(errorString, 'Ok', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
            duration: 5000,
            panelClass: [cssClass],
        });
    }
    horizontalPosition: MatSnackBarHorizontalPosition = 'center';
    verticalPosition: MatSnackBarVerticalPosition = 'top';
}
