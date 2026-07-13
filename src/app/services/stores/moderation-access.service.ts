import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { ModerationAccessStatus, ModerationPolicyKind, ModerationScope } from '../../interfaces/moderation';
import { ModerationService } from '../entities/moderation.service';
import { FirebasePresenceService } from '../realtime/firebase-presence.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';

@Injectable({ providedIn: 'root' })
export class ModerationAccessService {
    private readonly stateSubject = new BehaviorSubject<ModerationAccessStatus | null>(null);
    private readonly loadingSubject = new BehaviorSubject<boolean>(false);

    readonly state$ = this.stateSubject.asObservable();
    readonly loading$ = this.loadingSubject.asObservable();

    get state(): ModerationAccessStatus | null { return this.stateSubject.value; }
    get isLoading(): boolean { return this.loadingSubject.value; }

    constructor(private moderation: ModerationService, private realtime: RealtimeSocketService, private presence: FirebasePresenceService) { }

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

    private hasPendingPolicy(kind: ModerationPolicyKind): boolean {
        return this.state?.Politicas.some(policy => policy.Tipo === kind && policy.Pendiente) === true;
    }
}
