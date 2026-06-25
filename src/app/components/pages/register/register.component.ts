import { Component } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { RegisterRequest } from '../../../interfaces/askers/register-request';
import { RegisterService } from '../../../services/auth/register.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { customValidatorsModule } from '../../../modules/used-text-validator.module';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage } from '../../../shared/api-error-message';

@Component({
    standalone: true,
    selector:  'app-register',
    imports: [
        MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatSlideToggleModule,
        MatTooltipModule, SnackbarModule, customValidatorsModule, RouterLink
    ],
    templateUrl: './register.component.html',
    styleUrl: './register.component.sass'
})
export class RegisterComponent {
    names: string[] = [];
    isValid: boolean = false;
    passHide: boolean = true;
    readingQuote: ReadingQuote = getRandomReadingQuote();
    private readonly passwordSpecialChars = '@$!%*?&#ñÑ_';

    name = new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        this.customValidator.usedTextValidator(this.names)
    ]);
    username = new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9_]{3,50}$'),
        Validators.minLength(3),
        Validators.maxLength(50),
    ]);
    displayName = new FormControl('', [
        Validators.maxLength(80),
    ]);
    paisCodigo = new FormControl('', [
        Validators.pattern('^[A-Za-z]{2}$'),
        Validators.minLength(2),
        Validators.maxLength(2),
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

    errorNameMessage = '';
    errorUsernameMessage = '';
    errorDisplayNameMessage = '';
    errorPaisCodigoMessage = '';
    errorEmailMessage = '';
    errorPassMessage = '';

    fgRegister = this.fBuild.group({
        name: this.name,
        username: this.username,
        displayName: this.displayName,
        paisCodigo: this.paisCodigo,
        email: this.email,
        password: this.password,
    });

    constructor(private fBuild: FormBuilder, private registerSrv: RegisterService, private _snackBar: SnackbarModule, private router: Router, private customValidator: customValidatorsModule, private loader: LoaderEmmitterService) {
        merge(this.name.statusChanges, this.name.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateNameErrorMessage());
        merge(this.username.statusChanges, this.username.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateUsernameErrorMessage());
        merge(this.displayName.statusChanges, this.displayName.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateDisplayNameErrorMessage());
        merge(this.paisCodigo.statusChanges, this.paisCodigo.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePaisCodigoErrorMessage());
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
        else if (this.name.hasError('forbiddenValue'))
            this.errorNameMessage = 'Nombre de usuario no disponible';
        else this.errorNameMessage = 'Nombre no válido';
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

    updateDisplayNameErrorMessage() {
        if (this.displayName.hasError('maxlength'))
            this.errorDisplayNameMessage = 'Nombre visible demasiado largo';
        else this.errorDisplayNameMessage = '';
    }

    updatePaisCodigoErrorMessage() {
        if (this.paisCodigo.hasError('pattern') || this.paisCodigo.hasError('minlength') || this.paisCodigo.hasError('maxlength'))
            this.errorPaisCodigoMessage = 'Usa el código de país de dos letras';
        else this.errorPaisCodigoMessage = '';
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

        this.registerSrv.register(this.fgRegister.value as RegisterRequest)
            .pipe(
                finalize(() => this.loader.deactivateLoader()) // 👈 Esto se ejecuta SIEMPRE
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
}
