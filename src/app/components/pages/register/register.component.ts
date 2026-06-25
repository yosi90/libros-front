import { Component } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { finalize, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../../interfaces/askers/register-request';
import { RegisterService } from '../../../services/auth/register.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage } from '../../../shared/api-error-message';

@Component({
    standalone: true,
    selector:  'app-register',
    imports: [
        MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule, MatCardModule, MatButtonModule,
        SnackbarModule, RouterLink
    ],
    templateUrl: './register.component.html',
    styleUrl: './register.component.sass'
})
export class RegisterComponent {
    isValid: boolean = false;
    passHide: boolean = true;
    readingQuote: ReadingQuote = getRandomReadingQuote();
    private readonly passwordSpecialChars = '@$!%*?&#ñÑ_';
    private readonly defaultPaisCodigo = 'ES';

    username = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9_]{3,50}$'),
        Validators.minLength(3),
        Validators.maxLength(50),
    ]);
    email = new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(30),
    ]);
    password = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ_])[A-Za-z\\d@$!%*?&#ñÑ_]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(30),
    ]);

    errorUsernameMessage = '';
    errorEmailMessage = '';
    errorPassMessage = '';

    fgRegister = this.fBuild.group({
        username: this.username,
        email: this.email,
        password: this.password,
    });

    constructor(private fBuild: FormBuilder, private registerSrv: RegisterService, private _snackBar: SnackbarModule, private router: Router, private loader: LoaderEmmitterService) {
        merge(this.username.statusChanges, this.username.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUsernameErrorMessage());
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.password.statusChanges, this.password.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
    }

    updateUsernameErrorMessage() {
        if (this.username.hasError('required'))
            this.errorUsernameMessage = 'El alias no puede quedar vacío';
        else if (this.username.hasError('minlength'))
            this.errorUsernameMessage = 'Alias demasiado corto';
        else if (this.username.hasError('maxlength'))
            this.errorUsernameMessage = 'Alias demasiado largo';
        else this.errorUsernameMessage = 'Usa letras, números o guion bajo';
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
        else if (this.email.hasError('maxlength'))
            this.errorEmailMessage = 'Email demasiado largo';
        else if (this.email.hasError('email'))
            this.errorEmailMessage = 'Formato de email no válido';
        else this.errorEmailMessage = 'Email no válido';
    }

    updatePassErrorMessage() {
        if (this.password.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacía';
        else if (this.password.hasError('minlength'))
            this.errorPassMessage = 'La contraseña debe tener al menos 8 caracteres';
        else if (this.password.hasError('maxlength'))
            this.errorPassMessage = 'La contraseña no puede superar los 30 caracteres';
        else if (this.password.hasError('pattern')) {
            const missingRequirements = this.getMissingPasswordRequirements(this.password.value ?? '');
            this.errorPassMessage = missingRequirements.length
                ? `Debe incluir ${this.formatRequirementList(missingRequirements)}`
                : 'Contraseña no válida';
        } else this.errorPassMessage = '';
    }

    private getMissingPasswordRequirements(password: string): string[] {
        const missingRequirements: string[] = [];

        if (!/[a-z]/.test(password))
            missingRequirements.push('una minúscula');
        if (!/[A-Z]/.test(password))
            missingRequirements.push('una mayúscula');
        if (!/\d/.test(password))
            missingRequirements.push('un número');
        if (!/[@$!%*?&#ñÑ_]/.test(password))
            missingRequirements.push(`un símbolo (${this.passwordSpecialChars})`);

        return missingRequirements;
    }

    private formatRequirementList(requirements: string[]): string {
        if (requirements.length === 1)
            return requirements[0];
        if (requirements.length === 2)
            return `${requirements[0]} y ${requirements[1]}`;

        return `${requirements.slice(0, -1).join(', ')} y ${requirements[requirements.length - 1]}`;
    }

    doRegister() {
        if (this.fgRegister.invalid) {
            this._snackBar.openSnackBar('Error de credenciales', 'errorBar');
            return;
        }

        this.loader.activateLoader();

        this.registerSrv.register(this.buildRegisterRequest())
            .pipe(
                finalize(() => this.loader.deactivateLoader())
            )
            .subscribe({
                next: () => {
                    this.fgRegister.reset();
                    this.router.navigateByUrl('/login?registrationSuccess=true');
                },
                error: (error: any) => {
                    this._snackBar.openSnackBar(getApiErrorMessage(error, 'Hubo un error al crear el usuario'), 'errorBar');
                }
            });
    }

    private buildRegisterRequest(): RegisterRequest {
        const username = this.username.value ?? '';

        return {
            name: username,
            username,
            displayName: username,
            paisCodigo: this.defaultPaisCodigo,
            email: this.email.value ?? '',
            password: this.password.value ?? '',
        };
    }
}
