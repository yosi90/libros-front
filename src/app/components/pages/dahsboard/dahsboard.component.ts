import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { User } from '../../../interfaces/user';
import { UserService } from '../../../services/entities/user.service';
import { LoginService } from '../../../services/auth/login.service';
import { JwtInterceptorService } from '../../../services/auth/jwt-interceptor.service';
import { ErrorInterceptorService } from '../../../services/auth/error-interceptor.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    MatSnackBar,
    MatSnackBarHorizontalPosition,
    MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BookService } from '../../../services/entities/book.service';
import { BookT } from '../../../interfaces/templates/book-t';
import { NgxDropzoneChangeEvent, NgxDropzoneModule } from 'ngx-dropzone';
import { Book } from '../../../interfaces/book';
import { BooksComponent } from '../../shared/user/books/books.component';
import { UserRouterComponent } from '../../user-router/user-router.component';

@Component({
    selector: 'app-dahsboard',
    standalone: true,
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        CommonModule,
        MatTooltipModule,
        NgxDropzoneModule,
        RouterLink,
        UserRouterComponent
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: JwtInterceptorService,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ErrorInterceptorService,
            multi: true,
        },
    ],
    templateUrl: './dahsboard.component.html',
    styleUrl: './dahsboard.component.sass',
})
export class DahsboardComponent implements OnInit {
    userData?: User;

    modName: boolean = false;
    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z]{3,15}'),
        Validators.minLength(3),
        Validators.maxLength(15),
    ]);
    fgName = this.fBuild.group({
        name: this.name,
    });

    modEmail: boolean = false;
    errorEmailMessage = '';
    email = new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(30),
    ]);
    fgEmail = this.fBuild.group({
        email: this.email,
    });

    modPassword: boolean = false;
    errorPasswordOldMessage = '';
    passOldHide: boolean = true;
    errorPasswordNewMessage = '';
    passNewHide: boolean = true;
    errorPasswordRepeatMessage = '';
    passRepHide: boolean = true;
    passwordOld = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    passwordNew = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    passwordRepeat = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);
    fgPassword = this.fBuild.group({
        passwordOld: this.passwordOld,
        passwordNew: this.passwordNew,
        passwordRepeat: this.passwordRepeat,
    });

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

    constructor(
        private fBuild: FormBuilder,
        private loginSrv: LoginService,
        private userSrv: UserService,
        private bookSrv: BookService,
        private router: Router,
        private _snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
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

    navigate(bookId: number): void {
        this.router.navigate(['book', bookId]);
    }

    @HostListener('document:keydown.escape', ['$event'])
    handleEscapeEvent(event: KeyboardEvent) {
        if (this.modName === true) this.invertModName();
        if (this.modEmail === true) this.invertModEmail();
        if (this.modPassword === true) this.invertModPassword();
        if (this.newBook === true) this.invertNewBook();
    }

    @HostListener('document:keydown.enter', ['$event'])
    handleEnterEvent(event: KeyboardEvent) {
        if (this.modPassword === true && this.fgPassword.valid)
            this.updatePassword();
        else if (this.newBook === true && this.fgBook.valid) this.addBook();
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacio';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacio';
        else if (this.email.hasError('maxlength'))
            this.errorEmailMessage = 'Email demasiado largo';
        else this.errorEmailMessage = 'Email no válido';
    }

    updatePasswordOldErrorMessage() {
        if (this.passwordOld.hasError('required'))
            this.errorPasswordOldMessage = 'Debes introducir la contraseña previa';
        else if (this.passwordOld.hasError('minlength'))
            this.errorPasswordOldMessage = 'Contraseña demasiado corta';
        else if (this.passwordOld.hasError('maxlength'))
            this.errorPasswordOldMessage = 'Contraseña demasiado larga';
        else this.errorPasswordOldMessage = '';
    }
    updatePasswordNewErrorMessage() {
        if (this.passwordNew.hasError('required'))
            this.errorPasswordNewMessage =
                'La contraseña nueva no puede quedar vacia';
        else if (this.passwordNew.hasError('minlength'))
            this.errorPasswordNewMessage = 'Contraseña demasiado corta';
        else if (this.passwordNew.hasError('maxlength'))
            this.errorPasswordNewMessage = 'Contraseña demasiado larga';
        else if (
            this.passwordNew.value != this.passwordRepeat.value &&
            this.passwordRepeat.value
        ) {
            this.errorPasswordNewMessage = 'Las contraseñas no coinciden';
            this.passwordNew.setErrors({ 'Las contraseñas no coinciden': true });
        } else if (this.passwordOld.value == this.passwordNew.value) {
            this.errorPasswordNewMessage =
                'La contraseña nueva debe ser distinta a la anterior';
            this.passwordNew.setErrors({
                'La contraseña nueva debe ser distinta a la anterior': true,
            });
        } else this.errorPasswordNewMessage = '';
    }
    updatePasswordRepeatErrorMessage() {
        if (this.passwordRepeat.hasError('required'))
            this.errorPasswordRepeatMessage = 'Debes confirmar la contraseña nueva';
        else if (this.passwordRepeat.hasError('minlength'))
            this.errorPasswordRepeatMessage = 'Contraseña demasiado corta';
        else if (this.passwordRepeat.hasError('maxlength'))
            this.errorPasswordRepeatMessage = 'Contraseña demasiado larga';
        else if (this.passwordNew.value != this.passwordRepeat.value) {
            this.errorPasswordRepeatMessage = 'Las contraseñas no coinciden';
            this.passwordRepeat.setErrors({ 'Las contraseñas no coinciden': true });
        } else if (this.passwordOld.value == this.passwordRepeat.value) {
            this.errorPasswordRepeatMessage =
                'La contraseña nueva debe ser distinta a la anterior';
            this.passwordRepeat.setErrors({
                'La contraseña nueva debe ser distinta a la anterior': true,
            });
        } else this.errorPasswordRepeatMessage = '';
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

    invertModName(): void {
        this.modName = !this.modName;
        if (this.modName === true) {
            this.name.setValue(this.userData?.name ?? '');
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
            if (this.newBook === true) this.invertNewBook();
        }
    }
    updateName(nameNew: string): void {
        if (this.fgName.invalid || nameNew == this.userData?.name) {
            this.openSnackBar('Error: ' + this.fgName.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.userSrv.updateName(nameNew, token).subscribe({
            next: (user) => {
                this.userData = user;
                this.modName = !this.modName;
                this.openSnackBar('Nombre actualizado', 'successBar');
            },
            error: (errorData) => {
                this.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    invertModEmail(): void {
        this.modEmail = !this.modEmail;
        if (this.modEmail === true) {
            this.email.setValue(this.userData?.email ?? '');
            if (this.modName === true) this.invertModName();
            if (this.modPassword === true) this.invertModPassword();
            if (this.newBook === true) this.invertNewBook();
        }
    }
    updateEmail(emailNew: string): void {
        if (this.fgEmail.invalid || emailNew == this.userData?.email) {
            this.openSnackBar('Error: ' + this.fgEmail.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.userSrv.updateEmail(emailNew, token).subscribe({
            next: (user) => {
                this.userData = user;
                this.modEmail = !this.modEmail;
                this.openSnackBar('Email actualizado', 'successBar');
            },
            error: (errorData) => {
                this.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    invertModPassword(): void {
        this.modPassword = !this.modPassword;
        if (this.modPassword === true) {
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
            if (this.newBook === true) this.invertNewBook();
        } else {
            this.fgPassword.reset();
            this.fgPassword.markAsUntouched();
        }
    }
    updatePassword(): void {
        if (this.fgPassword.invalid) {
            this.openSnackBar('Error: ' + this.fgPassword.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.userSrv
            .updatePassword(
                this.fgPassword.value.passwordNew ?? '',
                this.fgPassword.value.passwordOld ?? '',
                token
            )
            .subscribe({
                next: (user) => {
                    this.userData = user;
                    this.modPassword = !this.modPassword;
                    this.openSnackBar('Contraseña actualizada', 'successBar');
                },
                error: (errorData) => {
                    this.openSnackBar(errorData, 'errorBar');
                },
            });
    }

    invertNewBook(): void {
        this.newBook = !this.newBook;
        if (this.newBook === true) {
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        } else {
            this.fgBook.reset();
            this.fgBook.markAsUntouched();
        }
    }
    addBook(): void {
        if (this.fgBook.invalid) {
            this.openSnackBar('Error: ' + this.fgBook.errors, 'errorBar');
            return;
        }
        const token = this.loginSrv.token;
        this.bookSrv.addBook(this.fgBook.value as BookT, token).subscribe({
            next: (book) => {
                this.userData?.books?.push(book);
                this.newBook = !this.newBook;
                this.openSnackBar('Libro añadido a la colección', 'successBar');
            },
            error: (errorData) => {
                this.openSnackBar(errorData, 'errorBar');
            },
        });
    }

    files: File[] = [];
    onSelect(event: NgxDropzoneChangeEvent) {
        const file = event.addedFiles[0];
        const formData = new FormData();
        const allowedExtensions = ['jpg'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            this.openSnackBar('Error: El archivo debe ser de tipo JPG.', 'errorBar');
            return;
        }
        formData.append('cover', file);
        const token = this.loginSrv.token;
        this.bookSrv.setCover(Number(event.source.id), formData, token).subscribe(
            (response: Book) => {
                this.openSnackBar(`Portada actualizada`, 'successBar');
                const bookToUpdate = this.userData?.books?.find(
                    (b) => b.bookId === response.bookId
                );
                if (bookToUpdate) bookToUpdate.cover = response.cover;
                else this.openSnackBar('Error al actualizar la portada', 'errorBar');
            },
            (error) => {
                this.openSnackBar(
                    `Error al actualizar la portada: ${error}`,
                    'errorBar'
                );
            }
        );
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
