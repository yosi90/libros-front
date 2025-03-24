import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { User } from '../../../../interfaces/user';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Universe } from '../../../../interfaces/universe';
import { Saga } from '../../../../interfaces/saga';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { AuthorStoreService } from '../../../../services/stores/author-store.service';
import { Author } from '../../../../interfaces/author';
import { BookSimple } from '../../../../interfaces/book';
import { Antology } from '../../../../interfaces/antology';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [MatCardModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButtonModule, MatIconModule, CommonModule, SnackbarModule, NgxDropzoneModule, MatChipsModule,
        MatTooltipModule, RouterLink],
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.sass'
})
export class UserProfileComponent implements OnInit {
    userData!: User;
    universes: Universe[] = [];
    sagas: Saga[] = [];
    authors: Author[] = [];
    books: BookSimple[] = [];
    antologies: Antology[] = [];

    viewportSize!: { width: number, height: number };
    imgUrl = environment.getImgUrl;
    imageCacheBuster: number = Date.now();

    personalDataState: boolean = false;
    bookDataState: boolean = false;
    showAuthors: boolean = false;
    showUniverses: boolean = false;
    showSagas: boolean = false;
    showBooks: boolean = true;
    showAntologies: boolean = false;

    modImg: boolean = false;
    photo!: File;
    files: File[] = [];

    modName: boolean = false;
    errorNameMessage = '';
    name = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z]{3,15}'),
        Validators.minLength(3),
        Validators.maxLength(30),
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

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private sessionSrv: SessionService, private userSrv: UserService, private fBuild: FormBuilder, private _snackBar: SnackbarModule, private loader: LoaderEmmitterService,
        private universeStore: UniverseStoreService, private authorStore: AuthorStoreService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.passwordOld.statusChanges, this.passwordOld.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordOldErrorMessage());
        merge(this.passwordNew.statusChanges, this.passwordNew.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordNewErrorMessage());
        merge(this.passwordRepeat.statusChanges, this.passwordRepeat.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordRepeatErrorMessage());
    }

    ngOnInit(): void {
        this.loader.activateLoader();
        this.getViewportSize();
        const user = this.sessionSrv.userObject;
        this.userData = user;
        this.name.setValue(user.name);
        this.email.setValue(user.email);

        this.authorStore.authors$.subscribe(authors => {
            this.authors = authors
            .filter(a => a.Nombre !== 'Anónimo')
            .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
        });

        this.universeStore.universes$.subscribe(universes => {
            this.universes = universes
                .filter(u => u.Nombre !== 'Sin universo')
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.sagas = this.universeStore.getAllSagas()
                .filter(s => s.Nombre !== 'Sin saga')
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.books = this.universeStore.getAllBooks()
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.antologies = this.universeStore.getAllAnthologies()
                .sort((a, b) => a.Nombre.localeCompare(b.Nombre));
            this.loader.deactivateLoader();
        });
    }

    @HostListener('document:keydown.escape', ['$event'])
    handleEscapeEvent() {
        if (this.modImg === true) this.invertModImg();
        if (this.modName === true) this.invertModName();
        if (this.modEmail === true) this.invertModEmail();
        if (this.modPassword === true) this.invertModPassword();
    }

    @HostListener('document:keydown.enter', ['$event'])
    handleEnterEvent() {
        if (this.modPassword === true && this.fgPassword.valid)
            this.updatePassword();
    }

    handleProfileImageError(event: any) {
        event.target.src = 'assets/media/img/error.png';
    }

    onSelect(event: { addedFiles: any; }) {
        this.files.push(...event.addedFiles);
        this.photo = event.addedFiles[0];
    }

    onRemove(event: File) {
        this.files.splice(this.files.indexOf(event), 1);
    }

    updateNameErrorMessage() {
        if (this.name.hasError('required'))
            this.errorNameMessage = 'El nombre no puede quedar vacío';
        else if (this.name.hasError('minlength'))
            this.errorNameMessage = 'Nombre demasiado corto';
        else if (this.name.hasError('maxlength'))
            this.errorNameMessage = 'Nombre demasiado largo';
        else this.errorNameMessage = 'Nombre no válido';
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
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
        else {
            this.errorPasswordOldMessage = '';
            this.passwordOld.setErrors(null);
        }
    }
    updatePasswordNewErrorMessage() {
        if (this.passwordNew.hasError('required'))
            this.errorPasswordNewMessage =
                'La contraseña nueva no puede quedar vacía';
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
        } else {
            this.errorPasswordNewMessage = '';
            this.passwordNew.setErrors(null);
        }
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
        } else {
            this.errorPasswordRepeatMessage = '';
            this.passwordRepeat.setErrors(null);
        }
    }

    invertModImg(): void {
        this.modImg = !this.modImg;
        if (this.modImg === true) {
            this.files = [];
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateImg(): void {
        if (this.files.length !== 1) {
            this._snackBar.openSnackBar('Error: problema con la imagen', 'errorBar');
            return;
        }
        this.loader.activateLoader();
        this.userSrv.updateImg(this.photo).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;

                    this.imageCacheBuster = Date.now();
                    this.modImg = false;
                    this._snackBar.openSnackBar('Imagen de perfil actualizada', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(err, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModName(): void {
        this.modName = !this.modName;
        if (this.modName === true) {
            this.name.setValue(this.userData.name);
            if (this.modImg === true) this.invertModImg();
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateName(nameNew: string): void {
        if (this.fgName.invalid || nameNew === this.userData.name) {
            this._snackBar.openSnackBar('Nombre inválido o sin cambios.', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.userSrv.updateName(nameNew).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;
                    this.modName = false;
                    this._snackBar.openSnackBar('Nombre actualizado', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(err, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModEmail(): void {
        this.modEmail = !this.modEmail;
        if (this.modEmail === true) {
            this.email.setValue(this.userData.email);
            if (this.modImg === true) this.invertModImg();
            if (this.modName === true) this.invertModName();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateEmail(emailNew: string): void {
        if (this.fgEmail.invalid || emailNew === this.userData.email) {
            this._snackBar.openSnackBar('Email inválido o sin cambios.', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.userSrv.updateEmail(emailNew).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;
                    this.modEmail = false;
                    this._snackBar.openSnackBar('Email actualizado', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(err, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    invertModPassword(): void {
        this.modPassword = !this.modPassword;
        if (this.modPassword === true) {
            if (this.modImg === true) this.invertModImg();
            if (this.modName === true) this.invertModName();
            if (this.modEmail === true) this.invertModEmail();
        } else {
            this.fgPassword.reset();
            this.fgPassword.markAsUntouched();
        }
    }
    updatePassword(): void {
        if (this.fgPassword.invalid) {
            this._snackBar.openSnackBar('Error: ' + this.fgPassword.errors, 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.userSrv.updatePassword(
            this.fgPassword.value.passwordNew ?? '',
            this.fgPassword.value.passwordOld ?? ''
        ).subscribe({
            next: () => {
                this.sessionSrv.requestNewToken().subscribe(() => {
                    this.userData = this.sessionSrv.userObject!;
                    this.modPassword = false;
                    this._snackBar.openSnackBar('Contraseña actualizada', 'successBar');
                });
            },
            error: (err) => {
                this._snackBar.openSnackBar(err, 'errorBar');
            },
            complete: () => {
                this.loader.deactivateLoader();
            }
        });
    }

    togglePersonalDataState(): void {
        this.personalDataState = !this.personalDataState;
        if (this.personalDataState) this.bookDataState = false;
        this.handleEscapeEvent();
    }

    toggleBookDataState(): void {
        this.bookDataState = !this.bookDataState;
        if (this.bookDataState) this.personalDataState = false;
    }

    toggleAuthors() {
        this.showAuthors = !this.showAuthors;
        if (this.showAuthors) {
            this.showUniverses = false;
            this.showSagas = false;
            this.showBooks = false;
            this.showAntologies = false;
        }
    }

    toggleUniverses() {
        this.showUniverses = !this.showUniverses;
        if (this.showUniverses) {
            this.showAuthors = false;
            this.showSagas = false;
            this.showBooks = false;
            this.showAntologies = false;
        }
    }

    toggleSagas() {
        this.showSagas = !this.showSagas;
        if (this.showSagas) {
            this.showAuthors = false;
            this.showUniverses = false;
            this.showBooks = false;
            this.showAntologies = false;
        }
    }

    toggleBooks() {
        this.showBooks = !this.showBooks;
        if (this.showBooks) {
            this.showAuthors = false;
            this.showUniverses = false;
            this.showSagas = false;
            this.showAntologies = false;
        }
    }

    toggleAntologies() {
        this.showAntologies = !this.showAntologies;
        if (this.showAntologies) {
            this.showAuthors = false;
            this.showUniverses = false;
            this.showSagas = false;
            this.showBooks = false;
        }
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        if (this.viewportSize.width > 1050 && !this.personalDataState)
            this.personalDataState = true;
        else if (this.viewportSize.width <= 1050 && this.personalDataState)
            this.personalDataState = false;
        if (this.viewportSize.width > 1050 && !this.bookDataState)
            this.bookDataState = true;
        else if (this.viewportSize.width <= 1050 && this.bookDataState)
            this.bookDataState = false;
    }
}

document.querySelectorAll('.js-marquee').forEach(function (e) {
    var letter = e.querySelector('span') ?? document.createElement('span');
    for (var counter = 1; counter <= 3; ++counter) {
        var clone = letter?.cloneNode(true);
        letter.after(clone);
    }
})