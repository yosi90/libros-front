import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage } from '../../../shared/api-error-message';
import { SessionService } from '../../../services/auth/session.service';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { VerifyEmailViewState } from './views/verify-email-view.contract';
import { VerifyEmailMobileViewComponent } from './views/mobile/verify-email-mobile-view.component';
import { VerifyEmailWoodViewComponent } from './views/wood/verify-email-wood-view.component';

@Component({
    standalone: true,
    selector: 'app-verify-email',
    imports: [SnackbarModule, VerifyEmailMobileViewComponent, VerifyEmailWoodViewComponent],
    templateUrl: './verify-email.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
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
        private sessionSrv: SessionService,
        readonly presentation: PresentationModeService
    ) { }

    get viewState(): VerifyEmailViewState {
        return { isVerifying: this.isVerifying, verified: this.verified, failed: this.failed, readingQuote: this.readingQuote };
    }

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
