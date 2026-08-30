import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { AuthApiService } from '../../../services/auth/auth-api.service';
import { AuthFlowStateService } from '../../../services/auth/auth-flow-state.service';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { SessionService } from '../../../services/auth/session.service';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { getApiErrorMessage } from '../../../shared/api-error-message';
import { PresentationModeService } from '../../../services/ui/presentation-mode.service';
import { OnboardingViewState } from './views/onboarding-view.contract';
import { OnboardingMobileViewComponent } from './views/mobile/onboarding-mobile-view.component';
import { OnboardingWoodViewComponent } from './views/wood/onboarding-wood-view.component';
import { findCountry, resolveDeviceCountryCode } from '../../../shared/countries';

@Component({
    standalone: true,
    selector: 'app-onboarding',
    imports: [SnackbarModule, OnboardingMobileViewComponent, OnboardingWoodViewComponent],
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

    readonly form = this.fb.group({
        alias: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9._-]{3,50}$')]],
        countryCode: ['', [(control: AbstractControl) => !control.value || findCountry(control.value) ? null : { country: true }]],
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
        return { form: this.form, policyTitle: this.policyTitle, policyMarkdown: this.policyMarkdown, loading: this.loading };
    }

    ngOnInit(): void {
        const state = this.flow.onboarding;
        if (!state) {
            void this.router.navigateByUrl('/login');
            return;
        }
        this.form.patchValue({ alias: state.draft.alias ?? '', countryCode: state.draft.countryCode ?? resolveDeviceCountryCode() ?? '' });
        this.api.getOnboardingContext().pipe(finalize(() => this.loading = false)).subscribe({
            next: context => {
                this.policyTitle = context.PoliticaUso.Titulo;
                this.policyMarkdown = context.PoliticaUso.Markdown;
                this.policyVersionId = context.PoliticaUso.Id;
            },
            error: error => this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo cargar la política de uso'), 'errorBar')
        });
    }

    submit(): void {
        const state = this.flow.onboarding;
        if (!state || this.form.invalid || !this.policyVersionId)
            return;
        this.loader.activateLoader();
        this.api.onboard({
            Ticket: state.result.Ticket,
            Alias: this.form.controls.alias.value ?? '',
            PaisCodigo: (this.form.controls.countryCode.value || null)?.toUpperCase() ?? null,
            PoliticaUsoVersionId: this.policyVersionId
        }).pipe(finalize(() => this.loader.deactivateLoader())).subscribe({
            next: result => {
                this.flow.consumeOnboarding();
                if (result.Estado === 'authenticated') {
                    this.session.applyAuthenticatedSession(result);
                    void this.router.navigateByUrl('/dashboard');
                    return;
                }
                void this.providerAuth.sendVerification()
                    .catch(() => this.snackBar.openSnackBar('La cuenta se creó, pero no se pudo enviar el correo. Podrás reintentarlo al iniciar sesión.', 'errorBar'))
                    .finally(() => void this.router.navigateByUrl('/verify-email-pending'));
            },
            error: error => this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo completar el registro'), 'errorBar')
        });
    }
}
