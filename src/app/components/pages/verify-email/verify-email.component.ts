import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { EmailVerificationService } from '../../../services/auth/email-verification.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage } from '../../../shared/api-error-message';
import { SessionService } from '../../../services/auth/session.service';

@Component({
    standalone: true,
    selector: 'app-verify-email',
    imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule, SnackbarModule],
    templateUrl: './verify-email.component.html',
    styleUrl: './verify-email.component.sass'
})
export class VerifyEmailComponent implements OnInit {
    token = '';
    isVerifying = false;
    verified = false;
    failed = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private verificationSrv: EmailVerificationService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule,
        private sessionSrv: SessionService
    ) { }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
        if (!this.token) {
            this.failed = true;
            this.snackBar.openSnackBar('El enlace de verificación no es válido', 'errorBar');
            return;
        }

        this.confirmEmail();
    }

    confirmEmail(): void {
        this.isVerifying = true;
        this.loader.activateLoader();
        this.verificationSrv.confirm(this.token)
            .pipe(finalize(() => {
                this.isVerifying = false;
                this.loader.deactivateLoader();
            }))
            .subscribe({
                next: () => {
                    // El token limitado anterior ya no representa el estado verificado recién confirmado.
                    this.sessionSrv.logout(false);
                    this.verified = true;
                    this.failed = false;
                },
                error: (error) => {
                    this.failed = true;
                    this.verified = false;
                    this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo verificar el email'), 'errorBar');
                }
            });
    }

    goToLogin(): void {
        this.router.navigateByUrl('/login?emailVerified=true');
    }
}
