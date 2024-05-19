import { Component, OnInit } from '@angular/core';
import { User } from '../../../../interfaces/user';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { Book } from '../../../../interfaces/book';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatCard, MatCardContent, MatCardFooter } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { BookService } from '../../../../services/entities/book.service';
import { MatIcon } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';

@Component({
    selector: 'app-books',
    standalone: true,
    imports: [MatCard, MatCardContent, MatCardFooter, NgxDropzoneModule, CommonModule, MatTooltip, MatIcon, RouterLink, SnackbarModule, NgxLoadingModule],
    templateUrl: './books.component.html',
    styleUrl: './books.component.sass'
})
export class BooksComponent implements OnInit {
    imgUrl = environment.apiUrl;

    building: boolean = true;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000'
    };

    userData!: User;

    constructor(private sessionSrv: SessionService, private router: Router, private _snackBar: SnackbarModule, private route: ActivatedRoute) {
        this.sessionSrv.user.subscribe(user => {
            this.userData = user;
            this.building = false;
        });
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

    handleCoverImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    openBook(bookId: number): void {
        this.router.navigate(['book', bookId]);
    }
}
