import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { EmailVerificationService } from '../../../services/auth/email-verification.service';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { SessionService } from '../../../services/auth/session.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';

@Component({
    standalone: true,
    selector: 'app-verify-email-pending',
    imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, SnackbarModule],
    templateUrl: './verify-email-pending.component.html',
    styleUrl: './verify-email-pending.component.sass'
})
export class VerifyEmailPendingComponent {
    isResending = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    constructor(
        public sessionSrv: SessionService,
        private verificationSrv: EmailVerificationService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule
    ) { }

    resendVerification(): void {
        this.isResending = true;
        this.loader.activateLoader();
        this.verificationSrv.resend()
            .pipe(finalize(() => {
                this.isResending = false;
                this.loader.deactivateLoader();
            }))
            .subscribe({
                next: () => this.snackBar.openSnackBar('Email de verificación reenviado', 'successBar'),
                error: () => this.snackBar.openSnackBar('No se pudo reenviar el email de verificación', 'errorBar')
            });
    }

    logout(): void {
        this.sessionSrv.logout();
    }
}
