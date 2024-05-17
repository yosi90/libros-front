import { Component, HostListener, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxLoadingModule, ngxLoadingAnimationTypes } from 'ngx-loading';
import { User } from '../../../../interfaces/user';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SessionService } from '../../../../services/auth/session.service';
import { UserService } from '../../../../services/entities/user.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { SnackbarModule } from '../../../../modules/snackbar.module';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [MatCardModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButtonModule, NgxLoadingModule, MatIconModule, CommonModule, SnackbarModule],
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.sass'
})
export class UserProfileComponent implements OnInit {
    viewportSize!: { width: number, height: number };
    personalDataState: boolean = false;

    userData: User = {
        userId: 0,
        name: '',
        email: ''
    }

    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000',
    };

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

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.getViewportSize();
    }

    constructor(private sessionSrv: SessionService, private userSrv: UserService, private fBuild: FormBuilder, private router: Router, private _snackBar: SnackbarModule) {
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
        this.getViewportSize();
        this.sessionSrv.user.subscribe(user => {
            if(user === null) {
                this.sessionSrv.logout('pr: Usuario fue null');
                this.router.navigateByUrl('/home');
            } else {
                this.userData = user;
                this.name.setValue(this.userData.name);
                this.email.setValue(this.userData.email);
            }
        });
    }

    @HostListener('document:keydown.escape', ['$event'])
    handleEscapeEvent() {
        if (this.modName === true) this.invertModName();
        if (this.modEmail === true) this.invertModEmail();
        if (this.modPassword === true) this.invertModPassword();
    }

    @HostListener('document:keydown.enter', ['$event'])
    handleEnterEvent() {
        if (this.modPassword === true && this.fgPassword.valid)
            this.updatePassword();
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
        else this.errorPasswordOldMessage = '';
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

    invertModName(): void {
        this.modName = !this.modName;
        if (this.modName === true) {
            this.name.setValue(this.userData?.name ?? '');
            if (this.modEmail === true) this.invertModEmail();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateName(nameNew: string): void {
        if (this.fgName.invalid || nameNew == this.userData?.name) {
            this._snackBar.openSnackBar('Error: ' + this.fgName.errors, 'errorBar');
            return;
        }
        this.waitingServerResponse = true;
        const token = this.sessionSrv.token;
        this.userSrv.updateName(nameNew, token).subscribe({
            next: (user) => {
                this.userData = user;
                this.modName = !this.modName;
                this._snackBar.openSnackBar('Nombre actualizado', 'successBar');
                this.waitingServerResponse = false;
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
                this.waitingServerResponse = false;
            },
        });
    }

    invertModEmail(): void {
        this.modEmail = !this.modEmail;
        if (this.modEmail === true) {
            this.email.setValue(this.userData?.email ?? '');
            if (this.modName === true) this.invertModName();
            if (this.modPassword === true) this.invertModPassword();
        }
    }
    updateEmail(emailNew: string): void {
        if (this.fgEmail.invalid || emailNew == this.userData?.email) {
            this._snackBar.openSnackBar('Error: ' + this.fgEmail.errors, 'errorBar');
            return;
        }
        this.waitingServerResponse = true;
        const token = this.sessionSrv.token;
        this.userSrv.updateEmail(emailNew, token).subscribe({
            next: (user) => {
                this.userData = user;
                this.modEmail = !this.modEmail;
                this._snackBar.openSnackBar('Email actualizado', 'successBar');
                this.waitingServerResponse = false;
            },
            error: (errorData) => {
                this._snackBar.openSnackBar(errorData, 'errorBar');
                this.waitingServerResponse = false;
            },
        });
    }

    invertModPassword(): void {
        this.modPassword = !this.modPassword;
        if (this.modPassword === true) {
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
        this.waitingServerResponse = true;
        const token = this.sessionSrv.token;
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
                    this._snackBar.openSnackBar('Contraseña actualizada', 'successBar');
                    this.waitingServerResponse = false;
                },
                error: (errorData) => {
                    this._snackBar.openSnackBar(errorData, 'errorBar');
                    this.waitingServerResponse = false;
                },
            });
    }

    toggleState(): void {
        this.personalDataState = !this.personalDataState;
    }

    getViewportSize() {
        this.viewportSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        if(this.viewportSize.width > 1050 && !this.personalDataState)
            this.personalDataState = true;
        else if (this.viewportSize.width <= 1050 && this.personalDataState)
            this.personalDataState = false;
    }
}

document.querySelectorAll('.js-marquee').forEach(function (e) {
    var letter = e.querySelector('span') ?? document.createElement('span');
    for (var counter = 1; counter <= 3; ++counter) {
        var clone = letter?.cloneNode(true);
        letter.after(clone);
    }
})