import { RegisterWebViewComponent } from './views/web/register-web-view.component';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    Validators,
} from '@angular/forms';
import { finalize, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { SessionService } from '../../../services/auth/session.service';
import { AuthFlowStateService } from '../../../services/auth/auth-flow-state.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { RegisterViewState } from './views/register-view.contract';
import { RegisterMobileViewComponent } from './views/mobile/register-mobile-view.component';
import { RegisterWoodViewComponent } from './views/wood/register-wood-view.component';

@Component({
    standalone: true,
    selector:  'app-register',
    imports: [SnackbarModule, RegisterMobileViewComponent, RegisterWebViewComponent, RegisterWoodViewComponent],
    templateUrl: './register.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class RegisterComponent {
    readingQuote: ReadingQuote = getRandomReadingQuote();
    private readonly passwordSpecialChars = '@$!%*?&#ñÑ_';

    email = new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
    ]);
    password = new FormControl('', [
        Validators.required,
        Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ_])[A-Za-z\\d@$!%*?&#ñÑ_]{8,}$'
        ),
        Validators.minLength(8),
        Validators.maxLength(20),
    ]);

    errorEmailMessage = '';
    errorPassMessage = '';

    fgRegister = this.fBuild.group({
        email: this.email,
        password: this.password,
    });

    constructor(
        private fBuild: FormBuilder,
        private providerAuth: FirebaseProviderAuthService,
        private session: SessionService,
        private authFlow: AuthFlowStateService,
        private _snackBar: SnackbarModule,
        private router: Router,
        private loader: LoaderEmmitterService,
        readonly presentation: PresentationModeService
    ) {
        this.email.setValue(this.authFlow.consumeRetryRegistrationEmail() ?? '');
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.password.statusChanges, this.password.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
    }

    get viewState(): RegisterViewState {
        return {
            form: this.fgRegister,
            email: this.email,
            password: this.password,
            emailError: this.errorEmailMessage,
            passwordError: this.errorPassMessage,
            readingQuote: this.readingQuote
        };
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
            this.errorPassMessage = 'La contraseña no puede superar los 20 caracteres';
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

        const email = this.email.value ?? '';
        const password = this.password.value ?? '';
        this.providerAuth.createPassword(email, password)
            .then(({ idToken }) => this.session.completeFirebaseSession(idToken).pipe(finalize(() => this.loader.deactivateLoader())).subscribe({
                next: result => {
                    if (result.Estado === 'onboarding_required') {
                        this.authFlow.setOnboarding(result, { registrationEmail: email });
                        void this.router.navigateByUrl('/onboarding');
                        return;
                    }
                    if (result.Estado === 'verification_required') {
                        void this.providerAuth.sendVerification().finally(() => void this.router.navigateByUrl('/verify-email-pending'));
                        return;
                    }
                    if (result.Estado === 'authenticated')
                        void this.router.navigateByUrl('/dashboard');
                },
                error: error => this._snackBar.openApiError(error, 'Hubo un error al crear el usuario')
            }))
            .catch(error => {
                this.loader.deactivateLoader();
                this._snackBar.openApiError(error, 'Hubo un error al crear el usuario');
            });
    }
}
