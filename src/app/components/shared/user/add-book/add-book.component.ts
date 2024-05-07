import { Component } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatTooltip } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';
import { LoginService } from '../../../../services/auth/login.service';
import { BookService } from '../../../../services/entities/book.service';
import { UserService } from '../../../../services/entities/user.service';
import { BookT } from '../../../../interfaces/templates/book-t';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
    selector: 'app-add-book',
    standalone: true,
    imports: [MatCard, MatCardContent, NgxDropzoneModule, MatTooltip, CommonModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, CommonModule, MatIconModule, NgxLoadingModule, MatInputModule, MatButtonModule],
    templateUrl: './add-book.component.html',
    styleUrl: './add-book.component.sass'
})
export class AddBookComponent {
    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000',
    };

    newBook: boolean = false;
    errorTitleMessage = '';
    errorAuthorMessage = '';
    title = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
    ]);
    author = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
    ]);
    fgBook = this.fBuild.group({
        title: this.title,
        author: this.author,
    });

    constructor(private loginSrv: LoginService, private userSrv: UserService, private bookSrv: BookService, private fBuild: FormBuilder, private _snackBar: MatSnackBar, private router: Router) {
        merge(this.title.statusChanges, this.title.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateTitleErrorMessage());
        merge(this.author.statusChanges, this.author.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateAuthorErrorMessage());
    }

    updateTitleErrorMessage() {
        if (this.title.hasError('required'))
            this.errorTitleMessage = 'El nombre no puede quedar vacio';
        else if (this.title.hasError('minlength'))
            this.errorTitleMessage = 'Nombre demasiado corto';
        else if (this.title.hasError('maxlength'))
            this.errorTitleMessage = 'Nombre demasiado largo';
        else this.errorTitleMessage = 'Nombre no válido';
    }
    updateAuthorErrorMessage() {
        if (this.author.hasError('required'))
            this.errorAuthorMessage = 'El nombre no puede quedar vacio';
        else if (this.author.hasError('minlength'))
            this.errorAuthorMessage = 'Nombre demasiado corto';
        else if (this.author.hasError('maxlength'))
            this.errorAuthorMessage = 'Nombre demasiado largo';
        else this.errorAuthorMessage = 'Nombre no válido';
    }

    addBook(): void {
        if (this.fgBook.invalid) {
            this.openSnackBar('Error: ' + this.fgBook.errors, 'errorBar');
            return;
        }
        this.waitingServerResponse = true;
        const token = this.loginSrv.token;
        this.bookSrv.addBook(this.fgBook.value as BookT, token).subscribe({
            next: () => {
                this.waitingServerResponse = false;
                this.fgBook.reset();
                this.router.navigateByUrl('/books?authorAdded=true');
            },
            error: (errorData) => {
                this.waitingServerResponse = false;
                this.openSnackBar(errorData, 'errorBar');
            },
        });
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