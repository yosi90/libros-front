import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { User } from '../../../../interfaces/user';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { SessionService } from '../../../../services/auth/session.service';
import { MatCard, MatCardContent, MatCardFooter } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { Book } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    selector: 'app-books',
    standalone: true,
    imports: [MatCard, MatCardContent, MatCardFooter, NgxDropzoneModule, CommonModule, MatTooltip, MatIcon, RouterLink, SnackbarModule, MatExpansionModule, MatButtonModule],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {
    imgUrl = environment.apiUrl;
    userData!: User;

    viewportSize!: { width: number, height: number };

    @ViewChild(MatAccordion) accordion!: MatAccordion;

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private sessionSrv: SessionService, private router: Router, private _snackBar: SnackbarModule, private route: ActivatedRoute, private loader: LoaderEmmitterService) {
        loader.activateLoader();
        this.sessionSrv.user.subscribe(user => {
            this.userData = user;
            loader.deactivateLoader();
        });
    }

    ngOnInit(): void {
        this.getViewportSize();
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

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    openBook(bookId: number): void {
        this.loader.activateLoader();
        this.router.navigate(['book', bookId]);
    }

    getAuthors(ids: number[]): string[] {
        let names: string[] = [];
        this.userData.authors.forEach(a => {
            if (ids.includes(a.authorId))
                names.push(a.name);
        });
        return names;
    }

    getSagas(ids: number[]): Saga[] {
        let sagas: Saga[] = [];
        this.userData.sagas.forEach(s => {
            if (ids.includes(s.sagaId) && s.name !== 'Sin saga')
                sagas.push(s);
        });
        return sagas;
    }

    getBooks(ids: number[], isUniverse: boolean = true): Book[] {
        let books: Book[] = [];
        if (this.userData.books)
            this.userData.books.forEach(b => {
                if (ids.includes(b.bookId) && (!isUniverse || b.sagaId === 1))
                    books.push(b);
            });
        return books;
    }

    getExpanded(ids: number[]): boolean {
        if (!this.userData.books)
            return false;
        return this.userData.books.filter(b => ids.includes(b.bookId)).map(b => b.status[b.status.length - 1].status.statusId).indexOf(3) >= 0;
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
