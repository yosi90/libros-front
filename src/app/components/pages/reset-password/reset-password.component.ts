import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { SessionService } from '../../../services/auth/session.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage } from '../../../shared/api-error-message';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { ResetPasswordViewState } from './views/reset-password-view.contract';
import { ResetPasswordMobileViewComponent } from './views/mobile/reset-password-mobile-view.component';
import { ResetPasswordWoodViewComponent } from './views/wood/reset-password-wood-view.component';

@Component({
    standalone: true,
    selector: 'app-reset-password',
    imports: [SnackbarModule, ResetPasswordMobileViewComponent, ResetPasswordWoodViewComponent],
    templateUrl: './reset-password.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class ResetPasswordComponent implements OnInit {
    actionCode = '';
    managedReturn = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();
    private readonly passwordSpecialChars = '@$!%*?&#ñÑ_';

    password = new FormControl('', [
        Validators.required,
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ_])[A-Za-z\\d@$!%*?&#ñÑ_]{8,}$'),
        Validators.minLength(8),
        Validators.maxLength(20),
    ]);
    passwordRepeat = new FormControl('', [Validators.required]);

    errorPassMessage = '';
    errorPassRepeatMessage = '';

    fgResetPassword = this.fBuild.group({
        password: this.password,
        passwordRepeat: this.passwordRepeat
    });

    constructor(
        private fBuild: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private providerAuth: FirebaseProviderAuthService,
        private snackBar: SnackbarModule,
        private loader: LoaderEmmitterService,
        private sessionSrv: SessionService,
        readonly presentation: PresentationModeService
    ) {
        merge(this.password.statusChanges, this.password.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
        merge(this.passwordRepeat.statusChanges, this.passwordRepeat.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePasswordRepeatErrorMessage());
    }

    get viewState(): ResetPasswordViewState {
        return {
            form: this.fgResetPassword,
            password: this.password,
            passwordRepeat: this.passwordRepeat,
            passwordError: this.errorPassMessage,
            passwordRepeatError: this.errorPassRepeatMessage,
            passwordsMatch: this.passwordsMatch(),
            actionCode: this.actionCode,
            readingQuote: this.readingQuote
        };
    }

    ngOnInit(): void {
        if (this.sessionSrv.userIsLogged)
            this.sessionSrv.logout(false);

        this.actionCode = this.route.snapshot.queryParamMap.get('oobCode') ?? '';
        this.managedReturn = !this.actionCode;
        if (this.actionCode)
            void this.providerAuth.inspectPasswordResetCode(this.actionCode).catch(() => {
                this.actionCode = '';
                this.snackBar.openSnackBar('El enlace de recuperación no es válido o ha caducado', 'errorBar');
            });
    }

    updatePassErrorMessage(): void {
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

        this.updatePasswordRepeatErrorMessage();
    }

    updatePasswordRepeatErrorMessage(): void {
        if (this.passwordRepeat.hasError('required'))
            this.errorPassRepeatMessage = 'Repite la contraseña';
        else if (this.password.value !== this.passwordRepeat.value)
            this.errorPassRepeatMessage = 'Las contraseñas no coinciden';
        else this.errorPassRepeatMessage = '';
    }

    passwordsMatch(): boolean {
        return !!this.password.value && this.password.value === this.passwordRepeat.value;
    }

    confirmReset(): void {
        this.updatePassErrorMessage();
        this.updatePasswordRepeatErrorMessage();
        if (this.fgResetPassword.invalid || !this.passwordsMatch() || !this.actionCode) {
            this.snackBar.openSnackBar('Revisa la nueva contraseña', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.providerAuth.confirmPasswordResetCode(this.actionCode, this.password.value ?? '')
            .then(() => void this.router.navigateByUrl('/login?passwordReset=true'))
            .catch(error => this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo actualizar la contraseña'), 'errorBar'))
            .finally(() => this.loader.deactivateLoader());
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
}
