import { DatePipe, NgIf, TitleCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AccessMethod, AccessMethodName, UserSession } from '../../../../interfaces/auth';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { AuthApiService } from '../../../../services/auth/auth-api.service';
import { FirebaseProviderAuthService } from '../../../../services/auth/firebase-provider-auth.service';
import { SessionService } from '../../../../services/auth/session.service';
import { getApiErrorMessage } from '../../../../shared/api-error-message';

@Component({
    standalone: true,
    selector: 'app-account-security',
    imports: [DatePipe, NgIf, TitleCasePipe, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, SnackbarModule],
    templateUrl: './account-security.component.html',
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
        private snackBar: SnackbarModule
    ) { }

    ngOnInit(): void { this.load(); }

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
            if (!token) return;
            this.api.reauthenticate(token).subscribe({
                next: result => { this.reauthenticationTicket = result.Ticket; this.busy = false; this.snackBar.openSnackBar('Identidad confirmada durante cinco minutos', 'successBar'); },
                error: error => this.notifyError(error, 'No se pudo confirmar tu identidad')
            });
        } catch (error) { this.notifyError(error, 'No se pudo confirmar tu identidad'); }
    }

    async linkGoogle(): Promise<void> {
        if (!this.requireReauthentication()) return;
        this.busy = true;
        try {
            const token = await this.providerAuth.signInGoogle('popup');
            if (!token) return;
            this.api.linkWithFirebase(this.reauthenticationTicket!, token).subscribe({ next: () => this.afterMutation('Google se ha vinculado a tu cuenta'), error: error => this.notifyError(error, 'No se pudo vincular Google') });
        } catch (error) { this.notifyError(error, 'No se pudo vincular Google'); }
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
            this.api.linkWithFirebase(this.reauthenticationTicket!, token, this.phoneAttemptId).subscribe({
                next: () => { this.phoneCodeRequested = false; this.phoneAttemptId = null; this.afterMutation('Teléfono vinculado'); },
                error: error => this.notifyError(error, 'No se pudo vincular el teléfono')
            });
        }).catch(error => this.notifyError(error, 'El código no es válido'));
    }

    revoke(device: UserSession): void {
        if (!confirm(`¿Cerrar la sesión de ${device.NombreDispositivo || 'este dispositivo'}?`)) return;
        this.api.revokeSession(device.Id).subscribe({ next: () => device.EsActual ? this.session.logout() : this.load(), error: error => this.notifyError(error, 'No se pudo cerrar la sesión') });
    }

    revokeAll(): void {
        if (!confirm('¿Cerrar todas las sesiones de la cuenta?')) return;
        this.api.revokeAllSessions().subscribe({ next: () => this.session.logout(), error: error => this.notifyError(error, 'No se pudieron cerrar las sesiones') });
    }

    methodLabel(method: AccessMethodName): string { return ({ password: 'contraseña', google: 'Google', phone: 'teléfono' })[method]; }

    private requireReauthentication(): boolean {
        if (this.reauthenticationTicket) return true;
        this.snackBar.openSnackBar('Confirma primero tu identidad', 'errorBar');
        return false;
    }

    private afterMutation(message: string): void { this.busy = false; this.snackBar.openSnackBar(message, 'successBar'); this.load(); }
    private notifyError(error: unknown, fallback: string): void { this.busy = false; this.snackBar.openSnackBar(getApiErrorMessage(error, fallback), 'errorBar'); }
}
