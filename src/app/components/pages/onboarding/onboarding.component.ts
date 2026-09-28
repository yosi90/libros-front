import { OnboardingWebViewComponent } from './views/web/onboarding-web-view.component';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { AuthApiService } from '../../../services/auth/auth-api.service';
import { AuthFlowStateService } from '../../../services/auth/auth-flow-state.service';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { SessionService } from '../../../services/auth/session.service';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { OnboardingViewState } from './views/onboarding-view.contract';
import { OnboardingMobileViewComponent } from './views/mobile/onboarding-mobile-view.component';
import { OnboardingWoodViewComponent } from './views/wood/onboarding-wood-view.component';
import { markBackendFieldError } from '../../../shared/backend-field-error';

@Component({
    standalone: true,
    selector: 'app-onboarding',
    imports: [SnackbarModule, OnboardingMobileViewComponent, OnboardingWebViewComponent, OnboardingWoodViewComponent],
    templateUrl: './onboarding.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: `
        :host
            display: block
            height: 100%
    `
})
export class OnboardingComponent implements OnInit {
    policyTitle = '';
    policyMarkdown = '';
    policyVersionId = 0;
    loading = true;
    policyFailed = false;
    changingEmail = false;
    registrationEmail = '';

    readonly form = this.fb.group({
        alias: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9._-]{3,50}$')]],
        accepted: [false, Validators.requiredTrue]
    });

    constructor(
        private fb: FormBuilder,
        private flow: AuthFlowStateService,
        private api: AuthApiService,
        private session: SessionService,
        private providerAuth: FirebaseProviderAuthService,
        private loader: LoaderEmmitterService,
        private snackBar: SnackbarModule,
        private router: Router,
        readonly presentation: PresentationModeService
    ) { }

    get viewState(): OnboardingViewState {
        return { form: this.form, policyTitle: this.policyTitle, policyMarkdown: this.policyMarkdown, loading: this.loading, policyFailed: this.policyFailed, registrationEmail: this.registrationEmail, changingEmail: this.changingEmail };
    }

    ngOnInit(): void {
        const state = this.flow.onboarding;
        if (!state) {
            void this.router.navigateByUrl('/login');
            return;
        }
        this.registrationEmail = state.draft.registrationEmail ?? '';
        this.loadPolicy();
    }

    async changeEmail(): Promise<void> {
        if (!this.registrationEmail || this.changingEmail) return;
        this.changingEmail = true;
        try {
            await this.providerAuth.discardPendingPasswordRegistration(this.registrationEmail);
            this.flow.consumeOnboarding();
            this.flow.setRetryRegistrationEmail(this.registrationEmail);
            await this.router.navigateByUrl('/register');
        } catch (error) {
            this.snackBar.openApiError(error, 'No se pudo volver a corregir el correo');
        } finally {
            this.changingEmail = false;
        }
    }

    loadPolicy(): void {
        this.loading = true;
        this.policyFailed = false;
        this.api.getOnboardingContext().pipe(finalize(() => this.loading = false)).subscribe({
            next: context => {
                this.policyTitle = context.PoliticaUso.Titulo;
                this.policyMarkdown = context.PoliticaUso.Markdown;
                this.policyVersionId = context.PoliticaUso.Id;
            },
            error: error => {
                // Sin política no hay alta posible: la vista lo explica y ofrece reintentar.
                this.policyFailed = true;
                this.snackBar.openApiError(error, 'No se pudo cargar la política de uso');
            }
        });
    }

    submit(): void {
        const state = this.flow.onboarding;
        if (!state || this.changingEmail || this.form.invalid || !this.policyVersionId)
            return;
        this.loader.activateLoader();
        this.api.onboard({
            Ticket: state.result.Ticket,
            Alias: this.form.controls.alias.value ?? '',
            PaisCodigo: 'ES',
            PoliticaUsoVersionId: this.policyVersionId
        }).pipe(finalize(() => this.loader.deactivateLoader())).subscribe({
            next: result => {
                this.flow.consumeOnboarding();
                if (result.Estado === 'authenticated') {
                    this.session.applyAuthenticatedSession(result);
                    void this.router.navigateByUrl('/dashboard');
                    return;
                }
                void this.finishPasswordOnboarding();
            },
            error: error => {
                // Un alias ya ocupado solo lo detecta el backend: se marca en el propio campo.
                markBackendFieldError({ Alias: this.form.controls.alias }, error);
                this.snackBar.openApiError(error, 'No se pudo completar el registro');
            }
        });
    }

    private async finishPasswordOnboarding(): Promise<void> {
        try {
            await this.providerAuth.sendVerification();
        } catch {
            this.snackBar.openSnackBar('La cuenta se creó, pero no se pudo enviar el correo. Podrás reintentarlo al iniciar sesión.', 'errorBar');
        }
        try {
            const token = await this.providerAuth.freshIdToken();
            await firstValueFrom(this.session.completeFirebaseSession(token));
        } catch (error) {
            this.snackBar.openApiError(error, 'No se pudo actualizar el estado de la cuenta');
        }
        await this.router.navigateByUrl('/verify-email-pending');
    }
}
