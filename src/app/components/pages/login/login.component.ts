import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin, merge, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../services/auth/session.service';
import { LoginRequest } from '../../../interfaces/askers/login-request';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { UniverseStoreService } from '../../../services/stores/universe-store.service';
import { AuthorService } from '../../../services/entities/author.service';
import { AuthorStoreService } from '../../../services/stores/author-store.service';
import { getRandomReadingQuote, ReadingQuote } from '../../../shared/reading-quotes';
import { getApiErrorMessage, getProductStateMessage } from '../../../shared/api-error-message';
import { CollectionService } from '../../../services/entities/collection.service';
import { ThemeSwitcherComponent } from '../../shared/common/theme-switcher/theme-switcher.component';
import { FirebaseSessionResult } from '../../../interfaces/auth';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { AuthFlowStateService } from '../../../services/auth/auth-flow-state.service';
import { AuthApiService } from '../../../services/auth/auth-api.service';
import { AdaptiveLayoutService } from '../../../services/ui/adaptive-layout.service';

@Component({
    standalone: true,
    selector:  'app-login',
    imports: [MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, FormsModule, ReactiveFormsModule, SnackbarModule,
        MatCardModule, MatButtonModule, RouterLink, MatTooltipModule, ThemeSwitcherComponent],
    templateUrl: './login.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './login.component.sass'
})
export class LoginComponent implements OnInit {
    isValid: boolean = false;
    passHide: boolean = true;
    readingQuote: ReadingQuote = getRandomReadingQuote();
    busy = false;
    linkRequired = false;
    phoneStep: 'number' | 'code' = 'number';
    phoneAttemptId: string | null = null;

    email = new FormControl('', [Validators.required, Validators.email]);
    contrasena = new FormControl('', [Validators.required]);
    phone = new FormControl('+34', [Validators.required, Validators.pattern('^\\+[1-9]\\d{7,14}$')]);
    phoneCode = new FormControl('', [Validators.required, Validators.pattern('^\\d{6}$')]);

    errorEmailMessage = '';
    errorPassMessage = '';

    fgLogin = this.fBuild.group({
        email: this.email,
        password: this.contrasena
    })

    constructor(private fBuild: FormBuilder, private router: Router, private sessionSrv: SessionService, private authorSrv: AuthorService, private snackBar: SnackbarModule, private route: ActivatedRoute,
        private loader: LoaderEmmitterService, private collectionSrv: CollectionService, private universeStore: UniverseStoreService, private authorStore: AuthorStoreService,
        public providerAuth: FirebaseProviderAuthService, private flow: AuthFlowStateService, private authApi: AuthApiService, private layout: AdaptiveLayoutService) {
        merge(this.email.statusChanges, this.email.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updateEmailErrorMessage());
        merge(this.contrasena.statusChanges, this.contrasena.valueChanges)
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.updatePassErrorMessage());
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            const registrationSuccess = params['registrationSuccess'];
            if (registrationSuccess === 'true')
                this.snackBar.openSnackBar('Registro creado. Revisa tu email para activar la cuenta.', 'successBar-margin');
            const passwordReset = params['passwordReset'];
            if (passwordReset === 'true')
                this.snackBar.openSnackBar('Contraseña actualizada. Por favor, inicie sesión.', 'successBar-margin');
            const resetRequested = params['resetRequested'];
            if (resetRequested === 'true')
                this.snackBar.openSnackBar('Si el correo existe, recibirás instrucciones para recuperar la contraseña.', 'successBar-margin');
            const emailVerified = params['emailVerified'];
            if (emailVerified === 'true') {
                this.snackBar.openSnackBar('Email verificado. Ya puedes iniciar sesión.', 'successBar-margin', 3000, {
                    title: 'Correo verificado',
                    dedupeKey: 'auth:email-verified'
                });
                void this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { emailVerified: null },
                    queryParamsHandling: 'merge',
                    replaceUrl: true
                });
            }
        });
        if (this.providerAuth.providers.google)
            void this.consumeGoogleRedirect();
    }

    updateEmailErrorMessage() {
        if (this.email.hasError('required'))
            this.errorEmailMessage = 'El email no puede quedar vacío';
        else
            this.errorEmailMessage = 'Email no válido';
    }

    updatePassErrorMessage() {
        if (this.contrasena.hasError('required'))
            this.errorPassMessage = 'La contraseña no puede quedar vacía';
        else
            this.errorPassMessage = 'Contraseña no válida';
    }

    doLogin() {
        if (this.fgLogin.invalid) {
            this.snackBar.openSnackBar('Error de credenciales', 'errorBar');
            return;
        }
    
        this.beginBusy();
        if (!this.linkRequired || !this.flow.link) {
            this.sessionSrv.login(this.fgLogin.value as LoginRequest).subscribe({
                next: result => this.handleSessionResult(result),
                error: error => this.showLoginError(error)
            });
            return;
        }
        this.providerAuth.signInPassword(this.email.value ?? '', this.contrasena.value ?? '').then(idToken =>
                this.authApi.reauthenticate(idToken).pipe(
                    switchMap(reauth => this.authApi.linkWithTicket(reauth.Ticket, this.flow.link!.Ticket)),
                    switchMap(() => this.sessionSrv.completeFirebaseSession(idToken))
                )).then(result$ => result$.subscribe({
            next: result => {
                this.flow.consumeLink();
                this.handleSessionResult(result);
            },
            error: error => this.showLoginError(error)
        })).catch(error => this.showLoginError(error));
    }

    async loginWithGoogle(): Promise<void> {
        this.beginBusy();
        try {
            const useRedirect = !this.layout.snapshot.isDesktop || matchMedia('(display-mode: standalone)').matches;
            const idToken = await this.providerAuth.signInGoogle(useRedirect ? 'redirect' : 'popup');
            if (idToken)
                this.sessionSrv.completeFirebaseSession(idToken).subscribe({ next: result => this.handleSessionResult(result), error: error => this.showLoginError(error) });
        } catch (error: any) {
            if (error?.code === 'auth/popup-blocked') {
                try { await this.providerAuth.signInGoogle('redirect'); } catch (redirectError) { this.showLoginError(redirectError); }
                return;
            }
            if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
                this.endBusy();
                this.snackBar.openSnackBar('Inicio de sesión con Google cancelado.', 'infoBar');
                return;
            }
            this.showLoginError(error);
        }
    }

    requestPhoneCode(): void {
        if (this.phone.invalid) return;
        this.beginBusy();
        this.authApi.phonePreflight(this.phone.value ?? '').subscribe({
            next: preflight => {
                this.phoneAttemptId = preflight.IntentoId;
                this.providerAuth.startPhone(this.phone.value ?? '', 'login-recaptcha').then(() => {
                    this.phoneStep = 'code';
                    this.endBusy();
                }).catch(error => this.showLoginError(error));
            },
            error: error => this.showLoginError(error)
        });
    }

    confirmPhoneCode(): void {
        if (this.phoneCode.invalid || !this.phoneAttemptId) return;
        this.beginBusy();
        this.providerAuth.confirmPhone(this.phoneCode.value ?? '').then(idToken => {
            this.sessionSrv.completeFirebaseSession(idToken, this.phoneAttemptId).subscribe({
                next: result => this.handleSessionResult(result),
                error: error => this.showLoginError(error)
            });
        }).catch(error => this.showLoginError(error));
    }

    private async consumeGoogleRedirect(): Promise<void> {
        try {
            const idToken = await this.providerAuth.consumeGoogleRedirect();
            if (!idToken) return;
            this.beginBusy();
            this.sessionSrv.completeFirebaseSession(idToken).subscribe({ next: result => this.handleSessionResult(result), error: error => this.showLoginError(error) });
        } catch (error) {
            this.showLoginError(error);
        }
    }

    private handleSessionResult(result: FirebaseSessionResult): void {
        if (result.Estado === 'onboarding_required') {
            this.flow.setOnboarding(result);
            this.endBusy();
            void this.router.navigateByUrl('/onboarding');
            return;
        }
        if (result.Estado === 'link_required') {
            this.flow.setLink(result);
            this.linkRequired = true;
            this.endBusy();
            this.snackBar.openSnackBar('Ese correo ya tiene una cuenta. Confirma su contraseña para vincular Google de forma explícita.', 'successBar-margin', 7000);
            return;
        }
        if (result.Estado === 'verification_required' || !this.sessionSrv.canAccessLibrary) {
            this.endBusy();
            void this.router.navigateByUrl('/verify-email-pending');
            return;
        }
        this.loadLibrary();
    }

    private loadLibrary(): void {
        forkJoin({ universes: this.collectionSrv.getUniverses(), authors: this.authorSrv.getAllAuthors() }).subscribe({
            next: ({ universes, authors }) => {
                this.universeStore.setUniverses(universes);
                this.authorStore.setAuthors(authors);
                void this.router.navigateByUrl('/dashboard');
            },
            error: error => this.abortLogin(error),
            complete: () => this.endBusy()
        });
    }

    private beginBusy(): void { this.busy = true; this.loader.activateLoader('login'); }
    private endBusy(): void { this.busy = false; this.loader.deactivateLoader(); }

    private showLoginError(error: unknown): void {
        this.endBusy();
        this.snackBar.openSnackBar(getApiErrorMessage(error, 'Error inesperado al iniciar sesión'), 'errorBar');
    }

    private abortLogin(error: unknown): void {
        const cause = getProductStateMessage(error, 'La API no ha permitido cargar tu biblioteca.');
        this.sessionSrv.logout(false);
        this.endBusy();
        this.snackBar.openSnackBar(`No se pudo completar el inicio de sesión. ${cause} Se ha cerrado la sesión.`, 'errorBar', 6000);
    }
}
