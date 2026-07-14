import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';
import { ModerationAccessStatus, ModerationPolicyKind, ModerationScope } from '../../interfaces/moderation';
import { ModerationService } from '../entities/moderation.service';
import { FirebasePresenceService } from '../realtime/firebase-presence.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { PolicyPromptService } from '../navigation/policy-prompt.service';

@Injectable({ providedIn: 'root' })
export class ModerationAccessService {
    private readonly stateSubject = new BehaviorSubject<ModerationAccessStatus | null>(null);
    private readonly loadingSubject = new BehaviorSubject<boolean>(false);

    readonly state$ = this.stateSubject.asObservable();
    readonly loading$ = this.loadingSubject.asObservable();

    get state(): ModerationAccessStatus | null { return this.stateSubject.value; }
    get isLoading(): boolean { return this.loadingSubject.value; }

    constructor(private moderation: ModerationService, private realtime: RealtimeSocketService, private presence: FirebasePresenceService, private policyPrompt: PolicyPromptService) {
        this.realtime.events$.subscribe(event => {
            if (event.type === 'realtime.access_revoked')
                this.refresh().subscribe();
        });
        this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected)
                this.refresh().subscribe();
        });
    }

    refresh(): Observable<ModerationAccessStatus | null> {
        if (this.loadingSubject.value)
            return of(this.state);

        this.loadingSubject.next(true);
        return this.moderation.getAccessStatus().pipe(
            tap(status => {
                this.stateSubject.next(status);
                if (status.RequiereLimpiarRealtime) {
                    this.realtime.closeAll();
                    void this.presence.clear();
                }
            }),
            map(status => status as ModerationAccessStatus | null),
            catchError(() => of(this.state)),
            finalize(() => this.loadingSubject.next(false))
        );
    }

    clear(): void {
        this.stateSubject.next(null);
        this.loadingSubject.next(false);
    }

    canUse(scope: ModerationScope, requiresCreationPolicy = false): boolean {
        const state = this.state;
        if (!state)
            return false;

        if (state.Restricciones.some(item => item.Activa && (item.Alcance === 'cuenta' || item.Alcance === scope)))
            return false;

        return !this.hasPendingPolicy('uso') && (!requiresCreationPolicy || !this.hasPendingPolicy('creacion'));
    }

    restrictionMessage(scope: ModerationScope, requiresCreationPolicy = false): string | null {
        const state = this.state;
        if (!state)
            return this.isLoading ? 'Comprobando permisos de Comunidad…' : 'No se ha podido comprobar el acceso a esta acción.';

        const restriction = state.Restricciones.find(item => item.Activa && (item.Alcance === 'cuenta' || item.Alcance === scope));
        if (restriction)
            return restriction.MotivoVisible || 'Esta acción no está disponible por una restricción de cuenta.';
        if (this.hasPendingPolicy('uso'))
            return 'Debes aceptar la política de uso antes de continuar.';
        if (requiresCreationPolicy && this.hasPendingPolicy('creacion'))
            return 'Debes aceptar la política de creación antes de publicar contenido.';
        return null;
    }

    accountRestrictionMessage(): string | null {
        const restriction = this.state?.Restricciones.find(item => item.Activa && item.Alcance === 'cuenta');
        return restriction?.MotivoVisible || (restriction ? 'La cuenta tiene restringidas las funciones sociales.' : null);
    }

    gate<T>(scope: ModerationScope, requiresCreationPolicy: boolean, request: Observable<T>): Observable<T> {
        // Antes de recibir el estado, REST conserva la autoridad para no bloquear el arranque de sesión.
        if (!this.state || this.canUse(scope, requiresCreationPolicy))
            return request;

        const message = this.restrictionMessage(scope, requiresCreationPolicy) || 'Esta acción no está disponible actualmente.';
        const code = this.hasPendingPolicy('uso') ? 'usage_policy_acceptance_required'
            : requiresCreationPolicy && this.hasPendingPolicy('creacion') ? 'creation_policy_acceptance_required'
            : 'capability_sanctioned';
        if (code === 'usage_policy_acceptance_required' || code === 'creation_policy_acceptance_required') this.policyPrompt.trigger(code);
        return throwError(() => ({ status: 403, code, error: message }));
    }

    private hasPendingPolicy(kind: ModerationPolicyKind): boolean {
        return this.state?.Politicas.some(policy => policy.Tipo === kind && policy.Pendiente) === true;
    }
}
