import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { ForgotPasswordViewState } from './views/forgot-password-view.contract';
import { ForgotPasswordMobileViewComponent } from './views/mobile/forgot-password-mobile-view.component';
import { ForgotPasswordWoodViewComponent } from './views/wood/forgot-password-wood-view.component';

@Component({
    standalone: true,
    selector: 'app-forgot-password',
    imports: [SnackbarModule, ForgotPasswordMobileViewComponent, ForgotPasswordWoodViewComponent],
    templateUrl: './forgot-password.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class ForgotPasswordComponent {
    email = new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]);
    errorEmailMessage = '';
    requestSent = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    fgForgotPassword = this.fBuild.group({
        email: this.email
    });

    constructor(
        private fBuild: FormBuilder,
        private router: Router,
        private providerAuth: FirebaseProviderAuthService,
        private snackBar: SnackbarModule,
        private loader: LoaderEmmitterService,
        readonly presentation: PresentationModeService
    ) {
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
    }

    get viewState(): ForgotPasswordViewState {
        return {
            form: this.fgForgotPassword,
            email: this.email,
            emailError: this.errorEmailMessage,
            readingQuote: this.readingQuote
        };
    }

    updateEmailErrorMessage(): void {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
        else if (this.email.hasError('maxlength'))
            this.errorEmailMessage = 'Email demasiado largo';
        else if (this.email.hasError('email'))
            this.errorEmailMessage = 'Formato de email no válido';
        else this.errorEmailMessage = 'Email no válido';
    }

    requestReset(): void {
        if (this.fgForgotPassword.invalid) {
            this.updateEmailErrorMessage();
            this.snackBar.openSnackBar('Revisa el correo indicado', 'errorBar');
            return;
        }

        this.loader.activateLoader();
        this.providerAuth.sendPasswordReset(this.email.value ?? '')
            .then(() => this.showGenericSuccess())
            .catch(() => this.showGenericSuccess())
            .finally(() => this.loader.deactivateLoader());
    }

    private showGenericSuccess(): void {
        this.requestSent = true;
        this.router.navigateByUrl('/login?resetRequested=true');
    }
}
