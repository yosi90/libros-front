import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { SessionService } from '../../../services/auth/session.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { ThemeSwitcherComponent } from '../../shared/common/theme-switcher/theme-switcher.component';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';

@Component({
    standalone: true,
    selector: 'app-verify-email-pending',
    imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, SnackbarModule, ThemeSwitcherComponent],
    templateUrl: './verify-email-pending.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './verify-email-pending.component.sass'
})
export class VerifyEmailPendingComponent {
    isResending = false;
    readingQuote: ReadingQuote = getRandomReadingQuote();

    constructor(
        public sessionSrv: SessionService,
        private providerAuth: FirebaseProviderAuthService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule
    ) { }

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
