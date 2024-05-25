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
import { MatTooltipModule } from '@angular/material/tooltip';
import { merge } from 'rxjs';
import { RegisterRequest } from '../../../../interfaces/askers/register-request';
import { RegisterService } from '../../../../services/auth/register.service';
import { SessionService } from '../../../../services/auth/session.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';

@Component({
    selector: 'app-admin-register',
    standalone: true,
    imports: [MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule,
        MatSlideToggleModule, MatTooltipModule, SnackbarModule],
    templateUrl: './admin-register.component.html',
    styleUrl: './admin-register.component.sass'
})
export class AdminRegisterComponent {
    isValid: boolean = false;
    passHide: boolean = true;

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

    constructor(private fBuild: FormBuilder, private registerSrv: RegisterService, private loginSrv: SessionService, private _snackBar: SnackbarModule,
        private loader: LoaderEmmitterService) {
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

    updatePassErrorMessage() {
        if (this.password.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacía';
        else if (this.password.hasError('minlength'))
            this.errorPassMessage = 'Contraseña demasiado corta';
        else if (this.password.hasError('maxlength'))
            this.errorPassMessage = 'Contraseña demasiado larga';
        else this.errorPassMessage = 'Contraseña no válida';
    }

    doRegister() {
        if (this.fgRegister.invalid) {
            this._snackBar.openSnackBar('Error de credenciales' + this.fgRegister.errors, 'errorBar');
            return;
        }
        this.loader.activateLoader();
        var res = false;
        const token = this.loginSrv.token;
        this.registerSrv
            .registerAdmin(this.fgRegister.value as RegisterRequest, token)
            .subscribe({
                next: () => {
                    res = true;
                    this.fgRegister.reset();
                    this._snackBar.openSnackBar('Admin creado', 'successBar-margin');
                },
                error: (errorData) => {
                    res = true;
                    this._snackBar.openSnackBar((errorData == 'Error' ? 'No hubo respuesta del servidor' : errorData), 'errorBar');
                    this.loader.deactivateLoader();
                },
                complete: () => {
                    if (!res) this._snackBar.openSnackBar('No hubo respuesta del servidor', 'errorBar');
                    this.loader.deactivateLoader();
                },
            });
    }
}
