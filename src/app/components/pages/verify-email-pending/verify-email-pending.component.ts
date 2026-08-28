import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { SessionService } from '../../../services/auth/session.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { VerifyEmailPendingViewState } from './views/verify-email-pending-view.contract';
import { VerifyEmailPendingMobileViewComponent } from './views/mobile/verify-email-pending-mobile-view.component';
import { VerifyEmailPendingWoodViewComponent } from './views/wood/verify-email-pending-wood-view.component';

@Component({
    standalone: true,
    selector: 'app-verify-email-pending',
    imports: [SnackbarModule, VerifyEmailPendingMobileViewComponent, VerifyEmailPendingWoodViewComponent],
    templateUrl: './verify-email-pending.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class VerifyEmailPendingComponent {
    isResending = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    constructor(
        public sessionSrv: SessionService,
        private providerAuth: FirebaseProviderAuthService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule,
        readonly presentation: PresentationModeService
    ) { }

    get viewState(): VerifyEmailPendingViewState {
        return { isResending: this.isResending, userEmail: this.sessionSrv.userEmail ?? '', readingQuote: this.readingQuote };
    }

    resendVerification(): void {
        this.isResending = true;
        this.loader.activateLoader();
        this.providerAuth.sendVerification()
            .then(() => this.snackBar.openSnackBar('Email de verificación reenviado', 'successBar'))
            .catch(() => this.snackBar.openSnackBar('Vuelve a iniciar sesión para reenviar el email de verificación', 'errorBar'))
            .finally(() => {
                this.isResending = false;
                this.loader.deactivateLoader();
            });
    }

    logout(): void {
        this.sessionSrv.logout();
    }
}
