import { ApiUserProfile } from './user';

export interface AuthDevice {
    Id?: number;
    Name?: string;
    Platform?: string;
}

export interface FirebaseSessionRequest {
    FirebaseIdToken: string;
    Device?: AuthDevice;
    PhoneAttemptId?: string | null;
}

export interface AuthenticatedSession {
    success: true;
    Estado: 'authenticated';
    AccessToken: string;
    ExpiresIn: 900;
    CsrfToken: string;
    Usuario: ApiUserProfile;
}

export interface OnboardingRequired {
    success: true;
    Estado: 'onboarding_required';
    Ticket: string;
    ExpiresIn: 600;
}

export interface LinkRequired {
    success: true;
    Estado: 'link_required';
    Ticket: string;
    ExpiresIn: 600;
}

export interface VerificationRequired {
    success: true;
    Estado: 'verification_required';
    Usuario: ApiUserProfile;
}

export type FirebaseSessionResult = AuthenticatedSession | OnboardingRequired | LinkRequired | VerificationRequired;

export interface CsrfTokenResponse {
    success: true;
    CsrfToken: string;
}

export interface OnboardingContext {
    success: true;
    PoliticaUso: {
        Id: number;
        Version: number;
        Titulo: string;
        Markdown: string;
        FechaPublicacion: string;
    };
}

export interface OnboardingRequest {
    Ticket: string;
    Alias: string;
    PoliticaUsoVersionId: number;
    PaisCodigo?: string | null;
}

export interface ReauthenticationResponse {
    success: true;
    Ticket: string;
    ExpiresIn: 300;
}

export type AccessMethodName = 'password' | 'google' | 'phone';

export interface AccessMethod {
    Metodo: AccessMethodName;
    ProveedorFirebase: 'password' | 'google.com' | 'phone';
    Recuperable: boolean;
    FechaVinculacion: string;
}

export interface AccessMethodsResponse {
    success: true;
    Metodos: AccessMethod[];
}

export interface UserSession {
    Id: string;
    NombreDispositivo: string | null;
    FechaCreacion: string;
    FechaUltimaActividad: string;
    FechaExpiracionInactividad: string;
    FechaExpiracionAbsoluta: string;
    Revocada: boolean;
    EsActual: boolean;
}

export interface UserSessionsResponse {
    success: true;
    Sesiones: UserSession[];
}

export interface PhonePreflightResponse {
    success: true;
    IntentoId: string;
    PaisNumeroCodigo: 'ES';
    PuedeSolicitarSms: true;
    ExpiresIn: number;
}

export interface EmailChangeReservationResponse {
    success: true;
    ReservaTicket: string;
    ExpiresIn: 86400;
}

export type InterfaceTheme = 'wood' | 'light' | 'dark';

export interface InterfacePreferences {
    Tema: InterfaceTheme;
    Version: number;
    FechaActualizacion: string | null;
}

export interface InterfacePreferencesResponse {
    success: true;
    Preferencias: InterfacePreferences;
}
