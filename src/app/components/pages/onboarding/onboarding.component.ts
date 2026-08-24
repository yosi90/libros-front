import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SnackbarModule } from '../../../modules/snackbar.module';
import { AuthApiService } from '../../../services/auth/auth-api.service';
import { AuthFlowStateService } from '../../../services/auth/auth-flow-state.service';
import { FirebaseProviderAuthService } from '../../../services/auth/firebase-provider-auth.service';
import { SessionService } from '../../../services/auth/session.service';
import { LoaderEmmitterService } from '../../../services/emmitters/loader.service';
import { getApiErrorMessage } from '../../../shared/api-error-message';
import { ThemeSwitcherComponent } from '../../shared/common/theme-switcher/theme-switcher.component';

@Component({
    standalone: true,
    selector: 'app-onboarding',
    imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, SnackbarModule, ThemeSwitcherComponent],
    templateUrl: './onboarding.component.html',
    styleUrl: './onboarding.component.sass'
})
export class OnboardingComponent implements OnInit {
    policyTitle = '';
    policyMarkdown = '';
    policyVersionId = 0;
    loading = true;

    readonly form = this.fb.group({
        alias: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9._-]{3,50}$')]],
        countryCode: ['ES', [Validators.pattern('^[A-Za-z]{2}$')]],
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
        private router: Router
    ) { }

    ngOnInit(): void {
        const state = this.flow.onboarding;
        if (!state) {
            void this.router.navigateByUrl('/login');
            return;
        }
        this.form.patchValue({ alias: state.draft.alias ?? '', countryCode: state.draft.countryCode ?? 'ES' });
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
