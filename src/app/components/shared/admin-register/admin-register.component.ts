import { Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ngxLoadingAnimationTypes, NgxLoadingModule } from 'ngx-loading';
import { merge } from 'rxjs';
import { RegisterRequest } from '../../../interfaces/templates/register-request';
import { RegisterService } from '../../../services/auth/register.service';
import { LoginService } from '../../../services/auth/login.service';

@Component({
    selector: 'app-admin-register',
    standalone: true,
    imports: [
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatTooltipModule,
        NgxLoadingModule,],
    templateUrl: './admin-register.component.html',
    styleUrl: './admin-register.component.sass'
})
export class AdminRegisterComponent {
    isValid: boolean = false;
    passHide: boolean = true;
    waitingServerResponse: boolean = false;
    public spinnerConfig = {
        animationType: ngxLoadingAnimationTypes.chasingDots,
        primaryColour: '#afcec2',
        secondaryColour: '#000000',
    };

    name = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z]{3,15}'),
        Validators.minLength(3),
        Validators.maxLength(15),
    ]);
    email = new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(30),
    ]);
    password = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ])[A-Za-z\\d@$!%*?&#ñÑ]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);

    errorNameMessage = '';
    errorEmailMessage = '';
    errorPassMessage = '';

    fgRegister = this.fBuild.group({
        name: this.name,
        email: this.email,
        password: this.password,
    });

    constructor(
        private fBuild: FormBuilder,
        private registerSrv: RegisterService,
        private loginSrv: LoginService,
        private _snackBar: MatSnackBar,
        private router: Router
    ) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.password.statusChanges, this.password.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
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

    updatePassErrorMessage() {
        if (this.password.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacia';
        else if (this.password.hasError('minlength'))
            this.errorPassMessage = 'Contraseña demasiado corta';
        else if (this.password.hasError('maxlength'))
            this.errorPassMessage = 'Contraseña demasiado larga';
        else this.errorPassMessage = 'Contraseña no válida';
    }

    doRegister() {
        if (this.fgRegister.invalid) {
            this.openSnackBar('Error de credenciales' + this.fgRegister.errors, 'errorBar');
            return;
        }
        if (this.waitingServerResponse) return;
        this.waitingServerResponse = true;
        var res = false;
        const token = this.loginSrv.token;
        this.registerSrv
            .registerAdmin(this.fgRegister.value as RegisterRequest, token)
            .subscribe({
                next: () => {
                    res = true;
                    this.fgRegister.reset();
                    this.openSnackBar('Admin creado', 'successBar-margin');
                },
                error: (errorData) => {
                    res = true;
                    this.openSnackBar((errorData == 'Error' ? 'No hubo respuesta del servidor' : errorData), 'errorBar');
                    this.waitingServerResponse = false;
                },
                complete: () => {
                    if (!res) this.openSnackBar('No hubo respuesta del servidor', 'errorBar');
                    this.waitingServerResponse = false;
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
