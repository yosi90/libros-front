import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { ModerationAccessRestriction, ModerationAccessStatus, ModerationScope } from '../../interfaces/moderation';
import { PlatformSessionService } from '../auth/platform-session.service';
import { AlcanceRestringido, RestriccionesPlataforma } from '../auth/yosiftware-sdk';
import { describePlatformRestriction } from '../../shared/api-error-message';

/** Lo que bloquea cada alcance de la plataforma en las pantallas de Libros (ADHESION_YOSIFTWARE.md). */
const SCOPES_BY_PLATFORM_SCOPE: Record<AlcanceRestringido, ModerationScope[]> = {
    creacion: ['creacion'],
    comunidad: ['comunidad', 'publicacion', 'chat', 'clubes'],
    chat: ['chat'],
    publicacion: ['publicacion']
};

/**
 * Qué puede hacer la cuenta en Libros. La moderación de cuentas y las normas son de la plataforma Yosiftware
 * (MODERACION.md): lo limitado llega en `restricciones` de la sesión (con `hasta`) y las normas pendientes las enseña
 * el SDK. Este servicio traduce `restricciones` a los alcances de las pantallas para no ofrecer lo limitado; la API
 * sigue siendo la autoridad (`403 platform_restriction_active`).
 */
@Injectable({ providedIn: 'root' })
export class ModerationAccessService {
    private readonly stateSubject = new BehaviorSubject<ModerationAccessStatus | null>(null);
    private readonly loadingSubject = new BehaviorSubject<boolean>(false);

    readonly state$ = this.stateSubject.asObservable();
    readonly loading$ = this.loadingSubject.asObservable();

    get state(): ModerationAccessStatus | null { return this.stateSubject.value; }
    get isLoading(): boolean { return this.loadingSubject.value; }

    constructor(private session: PlatformSessionService) {
        this.session.restricciones$.subscribe(() => {
            if (this.stateSubject.value && this.session.userIsLogged) this.publish();
        });
    }

    refresh(): Observable<ModerationAccessStatus | null> {
        if (!this.session.userIsLogged) return of(this.state);
        return of(this.publish());
    }

    clear(): void {
        this.stateSubject.next(null);
        this.loadingSubject.next(false);
    }

    canUse(scope: ModerationScope, _requiresCreationPolicy = false): boolean {
        const state = this.state;
        if (!state)
            return false;
        return !state.Restricciones.some(item => item.Activa && (item.Alcance === 'cuenta' || item.Alcance === scope));
    }

    restrictionMessage(scope: ModerationScope, _requiresCreationPolicy = false): string | null {
        const state = this.state;
        if (!state)
            return this.isLoading ? 'Comprobando permisos de Comunidad…' : 'No se ha podido comprobar el acceso a esta acción.';
        const restriction = state.Restricciones.find(item => item.Activa && (item.Alcance === 'cuenta' || item.Alcance === scope));
        return restriction ? restriction.MotivoVisible || 'Esta acción no está disponible por una restricción de cuenta.' : null;
    }

    /** Aviso del panel: lo que la cuenta tiene limitado y hasta cuándo. */
    accountRestrictionMessage(): string | null {
        return describePlatformRestrictions(this.session.restricciones);
    }

    gate<T>(scope: ModerationScope, requiresCreationPolicy: boolean, request: Observable<T>): Observable<T> {
        // Antes de recibir el estado, REST conserva la autoridad para no bloquear el arranque de sesión.
        if (!this.state || this.canUse(scope, requiresCreationPolicy))
            return request;
        const message = this.restrictionMessage(scope, requiresCreationPolicy) || 'Esta acción no está disponible actualmente.';
        return throwError(() => ({ status: 403, code: 'platform_restriction_active', error: message }));
    }

    private publish(): ModerationAccessStatus {
        const status = toAccessStatus(this.session.restricciones);
        this.stateSubject.next(status);
        return status;
    }
}

export function toAccessStatus(restricciones: RestriccionesPlataforma | null): ModerationAccessStatus {
    const alcances = restricciones?.alcances ?? [];
    const scopes = new Set<ModerationScope>(alcances.flatMap(alcance => SCOPES_BY_PLATFORM_SCOPE[alcance] ?? []));
    const message = describePlatformRestrictions(restricciones);
    const Restricciones: ModerationAccessRestriction[] = [...scopes].map(Alcance => ({
        Alcance,
        Activa: true,
        MotivoVisible: message,
        FechaInicio: null,
        FechaFin: restricciones?.hasta ?? null,
        EsPermanente: !restricciones?.hasta,
        SancionId: null,
        IncidenteId: null
    }));
    return {
        AlcancesActivos: [...scopes],
        Restricciones,
        Sanciones: [],
        Politicas: [],
        RequiereLimpiarRealtime: false,
        AlcancesQueRevocanRealtime: []
    };
}

/** Aviso de lo limitado en la sesión de la plataforma, con su fecha de fin. */
export function describePlatformRestrictions(restricciones: RestriccionesPlataforma | null): string | null {
    return describePlatformRestriction(restricciones?.alcances ?? [], restricciones?.hasta);
}
