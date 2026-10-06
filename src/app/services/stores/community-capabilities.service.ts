import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CommunityCapabilitiesResponse, CommunityCapabilityId } from '../../interfaces/community-capabilities';

const capabilityIds: CommunityCapabilityId[] = ['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes'];

@Injectable({ providedIn: 'root' })
export class CommunityCapabilitiesService {
    private readonly stateSubject = new BehaviorSubject<CommunityCapabilitiesResponse>(this.conservativeState());
    private rawState: CommunityCapabilitiesResponse = this.stateSubject.value;
    private policyHold = false;
    private userId: number | null = null;
    private expiresAt = 0;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private inFlight: { userId: number; request: Observable<CommunityCapabilitiesResponse> } | null = null;
    private requestVersion = 0;

    readonly state$ = this.stateSubject.asObservable();
    get state(): CommunityCapabilitiesResponse { return this.stateSubject.value; }

    constructor(private http: HttpClient) { }

    initialize(userId: number): Observable<CommunityCapabilitiesResponse> { return this.ensure(userId, true); }

    ensure(userId: number, force = false): Observable<CommunityCapabilitiesResponse> {
        if (this.inFlight?.userId === userId)
            return this.inFlight.request;
        if (!force && this.userId === userId && Date.now() < this.expiresAt)
            return of(this.state);

        const requestVersion = ++this.requestVersion;
        const headers = new HttpHeaders({ 'X-Client-Version': environment.clientVersion });
        const request = this.http.get<{ success: boolean } & CommunityCapabilitiesResponse>(`${environment.apiUrl}comunidad/capacidades`, { headers }).pipe(
            map(({ success: _success, ...state }) => state),
            tap(state => {
                if (requestVersion === this.requestVersion) this.setState(state, userId);
            }),
            catchError(() => {
                const fallback = this.conservativeState(userId);
                if (requestVersion === this.requestVersion) this.setState(fallback, userId, 300);
                return of(fallback);
            }),
            finalize(() => {
                if (this.inFlight?.userId === userId && requestVersion === this.requestVersion) this.inFlight = null;
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.inFlight = { userId, request };
        return request;
    }

    /**
     * Mientras falten las normas de uso, el backend rechaza tickets, chat, comunidad y clubes:
     * se presentan las capacidades como conservadoras para no pedirlos ni reintentarlos.
     */
    setPolicyHold(hold: boolean): void {
        if (this.policyHold === hold) return;
        this.policyHold = hold;
        this.publish();
    }

    isActive(capability: CommunityCapabilityId): boolean {
        return !this.state.Conservadora && this.state.Capacidades[capability].Activa;
    }

    clear(): void {
        this.requestVersion++;
        this.inFlight = null;
        this.userId = null;
        this.expiresAt = 0;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        this.policyHold = false;
        this.rawState = this.conservativeState();
        this.publish();
    }

    private setState(state: CommunityCapabilitiesResponse, userId: number, fallbackTtlSeconds?: number): void {
        this.userId = userId;
        this.rawState = state;
        this.publish();
        const ttlSeconds = Math.max(1, (fallbackTtlSeconds ?? state.CacheTtlSegundos) || 300);
        this.expiresAt = Date.now() + ttlSeconds * 1000;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => this.ensure(userId, true).subscribe(), ttlSeconds * 1000);
    }

    private publish(): void {
        this.stateSubject.next(this.policyHold ? { ...this.rawState, Conservadora: true } : this.rawState);
    }

    private conservativeState(userId = -1): CommunityCapabilitiesResponse {
        return {
            UsuarioId: userId,
            VersionConfiguracion: 0,
            VersionCliente: environment.clientVersion,
            FechaExpiracion: null,
            CacheTtlSegundos: 300,
            Conservadora: true,
            Capacidades: capabilityIds.reduce((all, id) => ({ ...all, [id]: { Activa: false, VersionMinima: null } }), {} as Record<CommunityCapabilityId, { Activa: boolean; VersionMinima: string | null }>)
        };
    }
}
