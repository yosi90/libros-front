import { DatePipe, TitleCasePipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AccessMethod, AccessMethodName, GoogleEmailMismatchConfirmationDetails, UserSession } from '../../../../interfaces/auth';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { AuthApiService } from '../../../../services/auth/auth-api.service';
import { FirebaseProviderAuthService } from '../../../../services/auth/firebase-provider-auth.service';
import { getGoogleEmailMismatchConfirmationDetails } from '../../../../services/auth/google-link-error';
import { isGoogleSignInCancellation } from '../../../../services/auth/google-sign-in-error';
import { SessionService } from '../../../../services/auth/session.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileAccountSecurityViewComponent } from '../../../mobile/user/mobile-account-security-view/mobile-account-security-view.component';
import { ModerationAppeal, ModerationIncident, ModerationPolicy, ModerationPolicyKind } from '../../../../interfaces/moderation';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { ModerationAccessService } from '../../../../services/stores/moderation-access.service';
import { getApiErrorCode } from '../../../../shared/api-error-message';
import { renderSafeMarkdown } from '../../../../shared/markdown';

@Component({
    standalone: true,
    selector: 'app-account-security',
    imports: [A11yModule, DatePipe, TitleCasePipe, FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, SnackbarModule, MobileAccountSecurityViewComponent],
    templateUrl: './account-security.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './account-security.component.sass'
})
export class AccountSecurityComponent implements OnInit {
    methods: AccessMethod[] = [];
    sessions: UserSession[] = [];
    reauthenticationTicket: string | null = null;
    emailReservationTicket: string | null = null;
    phoneAttemptId: string | null = null;
    phoneCodeRequested = false;
    busy = false;
    moderationIncidents: ModerationIncident[] = [];
    moderationAppeals: ModerationAppeal[] = [];
    isModerationLoading = true;
    appealDrafts: Record<number, string> = {};
    isSubmittingAppeal = false;
    policies: ModerationPolicy[] = [];
    isPoliciesLoading = true;
    policiesLoadError = false;
    acceptingPolicy: ModerationPolicyKind | null = null;
    private pendingGoogleLink: { firebaseIdToken: string; details: GoogleEmailMismatchConfirmationDetails } | null = null;

    get googleEmailMismatchDetails(): GoogleEmailMismatchConfirmationDetails | null {
        return this.pendingGoogleLink?.details ?? null;
    }

    readonly reauthForm = this.fb.group({ password: ['', Validators.required] });
    readonly passwordForm = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#ñÑ_])[A-Za-z\\d@$!%*?&#ñÑ_]{8,20}$')]]
    });
    readonly emailForm = this.fb.group({ email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]] });
    readonly phoneForm = this.fb.group({
        phone: ['+34', [Validators.required, Validators.pattern('^\\+[1-9]\\d{7,14}$')]],
        code: ['', Validators.pattern('^\\d{6}$')]
    });

    constructor(
        private fb: FormBuilder,
        private api: AuthApiService,
        public providerAuth: FirebaseProviderAuthService,
        public session: SessionService,
        private snackBar: SnackbarModule,
        private presentation: PresentationModeService,
        private moderation: ModerationService,
        private moderationAccess: ModerationAccessService,
        private route: ActivatedRoute
    ) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }

    ngOnInit(): void {
        this.load();
        this.loadPolicies();
        this.loadModeration();
        const section = this.route.snapshot.queryParamMap.get('section');
        if (section === 'policies' || section === 'moderation')
            setTimeout(() => document.getElementById(`account-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    load(): void {
        forkJoin({ methods: this.api.getAccessMethods(), sessions: this.api.getSessions() }).subscribe({
            next: result => { this.methods = result.methods.Metodos; this.sessions = result.sessions.Sesiones; },
            error: error => this.notifyError(error, 'No se pudo cargar la seguridad de la cuenta')
        });
    }

    hasMethod(method: AccessMethodName): boolean { return this.methods.some(item => item.Metodo === method); }

    reauthenticatePassword(): void {
        if (this.reauthForm.invalid) return;
        this.busy = true;
        this.providerAuth.signInPassword(this.session.userEmail, this.reauthForm.controls.password.value ?? '')
            .then(token => this.api.reauthenticate(token).subscribe({
                next: result => { this.reauthenticationTicket = result.Ticket; this.busy = false; this.snackBar.openSnackBar('Identidad confirmada durante cinco minutos', 'successBar'); },
                error: error => this.notifyError(error, 'No se pudo confirmar tu identidad')
            }))
            .catch(error => this.notifyError(error, 'No se pudo confirmar tu identidad'));
    }

    async reauthenticateGoogle(): Promise<void> {
        this.busy = true;
        try {
            const token = await this.providerAuth.signInGoogle('popup');
            if (!token) { this.busy = false; return; }
            this.api.reauthenticate(token).subscribe({
                next: result => { this.reauthenticationTicket = result.Ticket; this.busy = false; this.snackBar.openSnackBar('Identidad confirmada durante cinco minutos', 'successBar'); },
                error: error => this.notifyError(error, 'No se pudo confirmar tu identidad')
            });
        } catch (error) { this.finishCancelledGoogleActionOrNotify(error, 'No se pudo confirmar tu identidad'); }
    }

    async linkGoogle(): Promise<void> {
        if (!this.requireReauthentication()) return;
        this.cancelGoogleEmailMismatchConfirmation();
        this.busy = true;
        try {
            const token = await this.providerAuth.signInGoogle('popup');
            if (!token) { this.busy = false; return; }
            this.api.linkGoogle(this.reauthenticationTicket!, token).subscribe({
                next: () => this.afterMutation('Google se ha vinculado a tu cuenta'),
                error: error => {
                    const details = getGoogleEmailMismatchConfirmationDetails(error);
                    if (details) {
                        this.pendingGoogleLink = { firebaseIdToken: token, details };
                        this.busy = false;
                        return;
                    }
                    this.notifyError(error, 'No se pudo vincular Google');
                }
            });
        } catch (error) { this.finishCancelledGoogleActionOrNotify(error, 'No se pudo vincular Google'); }
    }

    confirmGoogleEmailMismatch(): void {
        const pending = this.pendingGoogleLink;
        if (!pending || !this.reauthenticationTicket || this.busy) return;
        this.pendingGoogleLink = null;
        this.busy = true;
        this.api.linkGoogle(this.reauthenticationTicket, pending.firebaseIdToken, true).subscribe({
            next: () => this.afterMutation('Google se ha vinculado a tu cuenta'),
            error: error => this.notifyError(error, 'No se pudo vincular Google')
        });
    }

    cancelGoogleEmailMismatchConfirmation(): void {
        this.pendingGoogleLink = null;
    }

    @HostListener('document:keydown.escape')
    closeGoogleEmailMismatchWithEscape(): void {
        if (!this.busy) this.cancelGoogleEmailMismatchConfirmation();
    }

    unlink(method: AccessMethodName): void {
        if (!this.requireReauthentication() || !confirm(`¿Desvincular el acceso mediante ${this.methodLabel(method)}?`)) return;
        this.busy = true;
        this.api.unlink(method, this.reauthenticationTicket!).subscribe({ next: () => this.afterMutation('Método desvinculado'), error: error => this.notifyError(error, 'No se pudo desvincular el método') });
    }

    changePassword(): void {
        if (!this.requireReauthentication() || this.passwordForm.invalid) return;
        this.busy = true;
        this.providerAuth.changePassword(this.passwordForm.controls.password.value ?? '')
            .then(() => { this.passwordForm.reset(); this.afterMutation('Contraseña actualizada'); })
            .catch(error => this.notifyError(error, 'No se pudo cambiar la contraseña'));
    }

    changeEmail(): void {
        if (!this.requireReauthentication() || this.emailForm.invalid) return;
        const email = this.emailForm.controls.email.value ?? '';
        this.busy = true;
        this.api.reserveEmail(this.reauthenticationTicket!, email).subscribe({
            next: reservation => {
                this.emailReservationTicket = reservation.ReservaTicket;
                this.providerAuth.requestEmailChange(email)
                    .then(() => { this.busy = false; this.snackBar.openSnackBar('Revisa el nuevo correo y, después, confirma aquí el cambio', 'successBar', 7000); })
                    .catch(error => this.notifyError(error, 'No se pudo enviar la verificación del nuevo correo'));
            },
            error: error => this.notifyError(error, 'No se pudo reservar el nuevo correo')
        });
    }

    confirmEmailChange(): void {
        if (!this.emailReservationTicket) return;
        this.busy = true;
        this.providerAuth.freshIdToken().then(token => this.api.confirmEmail(this.emailReservationTicket!, token).subscribe({
            next: () => { this.emailReservationTicket = null; this.afterMutation('Correo actualizado'); void this.session.refreshProfile().subscribe(); },
            error: error => this.notifyError(error, 'El correo todavía no aparece verificado')
        })).catch(error => this.notifyError(error, 'Debes volver a autenticarte'));
    }

    requestPhoneCode(): void {
        if (this.phoneForm.controls.phone.invalid || (!this.hasMethod('phone') && !this.requireReauthentication())) return;
        this.busy = true;
        const phone = this.phoneForm.controls.phone.value ?? '';
        this.api.phonePreflight(phone).subscribe({
            next: result => {
                this.phoneAttemptId = result.IntentoId;
                this.providerAuth.startPhone(phone, 'security-recaptcha').then(() => { this.phoneCodeRequested = true; this.busy = false; }).catch(error => this.notifyError(error, 'No se pudo enviar el código'));
            },
            error: error => this.notifyError(error, 'No se pudo validar el teléfono')
        });
    }

    confirmPhone(): void {
        if (!this.phoneAttemptId || this.phoneForm.controls.code.invalid) return;
        const phoneAttemptId = this.phoneAttemptId;
        this.busy = true;
        this.providerAuth.confirmPhone(this.phoneForm.controls.code.value ?? '').then(token => {
            if (this.hasMethod('phone')) {
                this.api.reauthenticate(token).subscribe({
                    next: result => {
                        this.reauthenticationTicket = result.Ticket;
                        this.phoneCodeRequested = false;
                        this.phoneAttemptId = null;
                        this.busy = false;
                        this.snackBar.openSnackBar('Identidad confirmada durante cinco minutos', 'successBar');
                    },
                    error: error => this.notifyError(error, 'No se pudo confirmar tu identidad')
                });
                return;
            }
            this.api.linkPhone(this.reauthenticationTicket!, token, phoneAttemptId).subscribe({
                next: () => { this.phoneCodeRequested = false; this.phoneAttemptId = null; this.afterMutation('Teléfono vinculado'); },
                error: error => this.notifyError(error, 'No se pudo vincular el teléfono')
            });
        }).catch(error => this.notifyError(error, 'El código no es válido'));
    }

    revoke(device: UserSession): void {
        if (!confirm(`¿Cerrar la sesión de ${device.NombreDispositivo || 'este dispositivo'}?`)) return;
        this.api.revokeSession(device.Id).subscribe({ next: () => device.EsActual ? this.session.logout() : this.load(), error: error => this.notifyError(error, 'No se pudo cerrar la sesión') });
    }

    logout(): void {
        this.session.logout();
    }

    revokeAll(): void {
        if (!confirm('¿Cerrar todas las sesiones de la cuenta?')) return;
        this.api.revokeAllSessions().subscribe({ next: () => this.session.logout(), error: error => this.notifyError(error, 'No se pudieron cerrar las sesiones') });
    }

    methodLabel(method: AccessMethodName): string { return ({ password: 'contraseña', google: 'Google', phone: 'teléfono' })[method]; }

    loadPolicies(): void {
        this.isPoliciesLoading = true;
        this.policiesLoadError = false;
        forkJoin((['uso', 'creacion'] as ModerationPolicyKind[]).map(kind => this.moderation.getActivePolicy(kind).pipe(
            map(policy => ({ policy, error: false })),
            catchError(error => of({ policy: null, error: getApiErrorCode(error) !== 'active_policy_not_found' }))
        ))).subscribe(results => {
            this.policies = results.flatMap(result => result.policy ? [result.policy] : []);
            this.policiesLoadError = results.some(result => result.error);
            this.isPoliciesLoading = false;
        });
    }

    acceptPolicy(kind: ModerationPolicyKind): void {
        if (this.acceptingPolicy) return;
        this.acceptingPolicy = kind;
        this.moderation.acceptPolicy(kind).subscribe({
            next: () => {
                this.moderationAccess.refresh().subscribe();
                this.loadPolicies();
                this.acceptingPolicy = null;
                this.snackBar.openSnackBar('Norma aceptada correctamente', 'successBar');
            },
            error: error => {
                this.acceptingPolicy = null;
                this.notifyError(error, 'No se ha podido registrar la aceptación');
            }
        });
    }

    renderPolicyMarkdown(markdown: string): string { return renderSafeMarkdown(markdown); }
    policyLabel(kind: ModerationPolicyKind): string { return kind === 'uso' ? 'Normas de uso' : 'Normas de creación'; }

    loadModeration(): void {
        this.isModerationLoading = true;
        this.moderation.listOwnIncidents({ limit: 50 }).subscribe({
            next: incidents => {
                this.moderationIncidents = incidents.items;
                this.moderation.listOwnAppeals().subscribe({
                    next: appeals => { this.moderationAppeals = appeals; this.isModerationLoading = false; },
                    error: () => this.isModerationLoading = false
                });
            },
            error: () => this.isModerationLoading = false
        });
    }

    hasAppeal(sanctionId: number): boolean { return this.moderationAppeals.some(appeal => appeal.SancionId === sanctionId); }

    submitAppeal(incident: ModerationIncident): void {
        const sanctionId = incident.Sancion.Id;
        const text = (this.appealDrafts[sanctionId] || '').trim();
        if (!sanctionId || incident.Sancion.Estado === 'none' || !text || this.isSubmittingAppeal) return;
        this.isSubmittingAppeal = true;
        this.moderation.createAppeal(sanctionId, text).subscribe({
            next: () => {
                delete this.appealDrafts[sanctionId];
                this.isSubmittingAppeal = false;
                this.snackBar.openSnackBar('Alegación enviada', 'successBar');
                this.loadModeration();
            },
            error: error => {
                this.isSubmittingAppeal = false;
                this.notifyError(error, 'No se ha podido enviar la alegación');
            }
        });
    }

    moderationStatusLabel(status: string): string {
        const labels: Record<string, string> = { none: 'Sin sanción', banned: 'Cuenta suspendida', blocked: 'Bloqueada', sanctioned: 'Sancionada', revoked: 'Revocada', pendiente: 'Pendiente', en_revision: 'En revisión', aceptada: 'Aceptada', rechazada: 'Rechazada' };
        return labels[status] ?? status;
    }

    private requireReauthentication(): boolean {
        if (this.reauthenticationTicket) return true;
        this.snackBar.openSnackBar('Confirma primero tu identidad', 'errorBar');
        return false;
    }

    private afterMutation(message: string): void { this.busy = false; this.snackBar.openSnackBar(message, 'successBar'); this.load(); }
    private finishCancelledGoogleActionOrNotify(error: unknown, fallback: string): void {
        if (isGoogleSignInCancellation(error)) {
            this.busy = false;
            return;
        }
        this.notifyError(error, fallback);
    }
    private notifyError(error: unknown, fallback: string): void { this.busy = false; this.snackBar.openSnackBar(getApiErrorMessage(error, fallback), 'errorBar'); }
}
