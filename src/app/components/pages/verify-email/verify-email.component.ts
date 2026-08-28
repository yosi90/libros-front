import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage } from '../../../shared/api-error-message';
import { SessionService } from '../../../services/auth/session.service';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';

@Component({
    standalone: true,
    selector: 'app-verify-email',
    imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, SnackbarModule],
    templateUrl: './verify-email.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './verify-email.component.sass'
})
export class VerifyEmailComponent implements OnInit {
    actionCode = '';
    isVerifying = false;
    verified = false;
    failed = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private providerAuth: FirebaseProviderAuthService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule,
        private sessionSrv: SessionService
    ) { }

    ngOnInit(): void {
        this.actionCode = this.route.snapshot.queryParamMap.get('oobCode') ?? '';
        if (!this.actionCode) {
            // El handler administrado por Firebase ya consumio la accion antes del retorno.
            this.verified = true;
            return;
        }

        this.confirmEmail();
    }

    confirmEmail(): void {
        this.isVerifying = true;
        this.loader.activateLoader();
        this.providerAuth.confirmEmailVerification(this.actionCode)
            .then(() => {
                this.isVerifying = false;
                this.loader.deactivateLoader();
                this.sessionSrv.logout(false);
                this.verified = true;
                this.failed = false;
            })
            .catch(error => {
                this.isVerifying = false;
                this.loader.deactivateLoader();
                this.failed = true;
                this.verified = false;
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo verificar el email'), 'errorBar');
            });
    }

    goToLogin(): void {
        this.router.navigateByUrl('/login?emailVerified=true');
    }
}
