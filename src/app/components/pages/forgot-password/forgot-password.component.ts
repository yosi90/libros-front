import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { PasswordResetService } from '../../../services/auth/password-reset.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';

@Component({
    standalone: true,
    selector: 'app-forgot-password',
    imports: [FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, SnackbarModule],
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.sass'
})
export class ForgotPasswordComponent {
    email = new FormControl('', [Validators.required, Validators.email, Validators.maxLength(30)]);
    errorEmailMessage = '';
    requestSent = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    fgForgotPassword = this.fBuild.group({
        email: this.email
    });

    constructor(
        private fBuild: FormBuilder,
        private passwordResetSrv: PasswordResetService,
        private snackBar: SnackbarModule,
        private loader: LoaderEmmitterService
    ) {
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
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
        this.passwordResetSrv.request(this.email.value ?? '')
            .pipe(finalize(() => this.loader.deactivateLoader()))
            .subscribe({
                next: () => this.showGenericSuccess(),
                error: () => this.showGenericSuccess()
            });
    }

    private showGenericSuccess(): void {
        this.requestSent = true;
        this.fgForgotPassword.reset();
        this.snackBar.openSnackBar('Si el correo existe, recibirás instrucciones para recuperar la contraseña.', 'successBar');
    }
}
