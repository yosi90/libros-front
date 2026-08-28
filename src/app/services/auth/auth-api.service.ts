import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    AccessMethodsResponse,
    AuthenticatedSession,
    CsrfTokenResponse,
    EmailChangeReservationResponse,
    FirebaseSessionRequest,
    FirebaseSessionResult,
    InterfacePreferencesResponse,
    LinkRequired,
    OnboardingContext,
    OnboardingRequest,
    PhonePreflightResponse,
    ReauthenticationResponse,
    UserSessionsResponse
} from '../../interfaces/auth';
import { ApiUserProfile } from '../../interfaces/user';
import { NativeSessionTransportAdapter } from '../native/native-session-transport.adapter';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
    private readonly authUrl = `${environment.apiUrl}auth`;

    constructor(
        private http: HttpClient,
        private nativeTransport: NativeSessionTransportAdapter,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    exchange(request: FirebaseSessionRequest): Observable<FirebaseSessionResult> {
        if (this.nativeMobile)
            return from(this.nativeTransport.exchange(request));
        return this.http.post<FirebaseSessionResult>(`${this.authUrl}/session`, request, { withCredentials: true });
    }

    restoreCsrf(): Observable<CsrfTokenResponse> {
        if (this.nativeMobile)
            return from(this.nativeTransport.restoreCsrf());
        return this.http.get<CsrfTokenResponse>(`${this.authUrl}/session/csrf`, { withCredentials: true });
    }

    refresh(csrfToken: string): Observable<AuthenticatedSession> {
        if (this.nativeMobile)
            return from(this.nativeTransport.refresh(csrfToken));
        return this.http.post<AuthenticatedSession>(`${this.authUrl}/session/refresh`, {}, {
            withCredentials: true,
            headers: this.csrfHeaders(csrfToken)
        });
    }

    logout(csrfToken: string): Observable<unknown> {
        if (this.nativeMobile)
            return from(this.nativeTransport.logout(csrfToken));
        return this.http.delete(`${this.authUrl}/session`, {
            withCredentials: true,
            headers: this.csrfHeaders(csrfToken)
        });
    }

    getUser(): Observable<{ success: true; user: ApiUserProfile }> {
        return this.http.get<{ success: true; user: ApiUserProfile }>(`${this.authUrl}/user`);
    }

    getOnboardingContext(): Observable<OnboardingContext> {
        return this.http.get<OnboardingContext>(`${this.authUrl}/onboarding-context`);
    }

    onboard(request: OnboardingRequest): Observable<AuthenticatedSession | { success: true; Estado: 'verification_required' }> {
        return this.http.post<AuthenticatedSession | { success: true; Estado: 'verification_required' }>(`${this.authUrl}/onboarding`, request, { withCredentials: true });
    }

    reauthenticate(firebaseIdToken: string): Observable<ReauthenticationResponse> {
        return this.http.post<ReauthenticationResponse>(`${this.authUrl}/reauthentication`, { FirebaseIdToken: firebaseIdToken });
    }

    getAccessMethods(): Observable<AccessMethodsResponse> {
        return this.http.get<AccessMethodsResponse>(`${this.authUrl}/access-methods`);
    }

    linkWithTicket(reauthenticationTicket: string, linkTicket: LinkRequired['Ticket']): Observable<unknown> {
        return this.http.post(`${this.authUrl}/access-methods/link`, {
            ReauthenticationTicket: reauthenticationTicket,
            LinkTicket: linkTicket
        });
    }

    linkGoogle(reauthenticationTicket: string, firebaseIdToken: string, confirmEmailMismatch = false): Observable<unknown> {
        const request: Record<string, unknown> = {
            ReauthenticationTicket: reauthenticationTicket,
            FirebaseIdToken: firebaseIdToken
        };
        if (confirmEmailMismatch) request['ConfirmEmailMismatch'] = true;
        return this.http.post(`${this.authUrl}/access-methods/link`, request);
    }

    linkPhone(reauthenticationTicket: string, firebaseIdToken: string, phoneAttemptId: string): Observable<unknown> {
        return this.http.post(`${this.authUrl}/access-methods/link`, {
            ReauthenticationTicket: reauthenticationTicket,
            FirebaseIdToken: firebaseIdToken,
            PhoneAttemptId: phoneAttemptId
        });
    }

    unlink(method: string, reauthenticationTicket: string): Observable<unknown> {
        return this.http.delete(`${this.authUrl}/access-methods/${method}`, { body: { ReauthenticationTicket: reauthenticationTicket } });
    }

    getSessions(): Observable<UserSessionsResponse> {
        return this.http.get<UserSessionsResponse>(`${this.authUrl}/sessions`);
    }

    revokeSession(sessionId: string): Observable<unknown> {
        return this.http.delete(`${this.authUrl}/sessions/${encodeURIComponent(sessionId)}`);
    }

    revokeAllSessions(): Observable<unknown> {
        return this.http.post(`${this.authUrl}/sessions/revoke-all`, {});
    }

    phonePreflight(phone: string): Observable<PhonePreflightResponse> {
        return this.http.post<PhonePreflightResponse>(`${this.authUrl}/phone/preflight`, { Telefono: phone });
    }

    reserveEmail(reauthenticationTicket: string, email: string): Observable<EmailChangeReservationResponse> {
        return this.http.post<EmailChangeReservationResponse>(`${this.authUrl}/email-change/reservations`, {
            ReauthenticationTicket: reauthenticationTicket,
            NuevoEmail: email
        });
    }

    confirmEmail(reservationTicket: string, firebaseIdToken: string): Observable<unknown> {
        return this.http.post(`${this.authUrl}/email-change/confirm`, {
            ReservaTicket: reservationTicket,
            FirebaseIdToken: firebaseIdToken
        });
    }

    getInterfacePreferences(): Observable<InterfacePreferencesResponse> {
        return this.http.get<InterfacePreferencesResponse>(`${environment.apiUrl}usuarios/me/preferencias-interfaz`);
    }

    patchInterfacePreferences(version: number, theme: string): Observable<InterfacePreferencesResponse> {
        return this.http.patch<InterfacePreferencesResponse>(`${environment.apiUrl}usuarios/me/preferencias-interfaz`, {
            Version: version,
            Tema: theme
        });
    }

    private csrfHeaders(token: string): HttpHeaders {
        return new HttpHeaders({ 'X-CSRF-Token': token });
    }
}
