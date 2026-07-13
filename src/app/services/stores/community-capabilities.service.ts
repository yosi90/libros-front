import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CommunityCapabilitiesResponse, CommunityCapabilityId } from '../../interfaces/community-capabilities';

const capabilityIds: CommunityCapabilityId[] = ['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes'];

@Injectable({ providedIn: 'root' })
export class CommunityCapabilitiesService {
    private readonly stateSubject = new BehaviorSubject<CommunityCapabilitiesResponse>(this.conservativeState());
    private loading = false;
    private userId: number | null = null;
    private expiresAt = 0;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;

    readonly state$ = this.stateSubject.asObservable();
    get state(): CommunityCapabilitiesResponse { return this.stateSubject.value; }

    constructor(private http: HttpClient) { }

    initialize(userId: number): Observable<CommunityCapabilitiesResponse> { return this.ensure(userId, true); }

    ensure(userId: number, force = false): Observable<CommunityCapabilitiesResponse> {
        if (!force && this.userId === userId && Date.now() < this.expiresAt)
            return of(this.state);
        if (this.loading)
            return of(this.state);

        this.loading = true;
        const headers = new HttpHeaders({ 'X-Client-Version': environment.clientVersion });
        return this.http.get<{ success: boolean } & CommunityCapabilitiesResponse>(`${environment.apiUrl}comunidad/capacidades`, { headers }).pipe(
            map(({ success: _success, ...state }) => state),
            tap(state => this.setState(state, userId)),
            catchError(() => {
                const fallback = this.conservativeState(userId);
                this.setState(fallback, userId, 300);
                return of(fallback);
            }),
            finalize(() => this.loading = false)
        );
    }

    isActive(capability: CommunityCapabilityId): boolean {
        return !this.state.Conservadora && this.state.Capacidades[capability].Activa;
    }

    clear(): void {
        this.userId = null;
        this.expiresAt = 0;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        this.stateSubject.next(this.conservativeState());
    }

    private setState(state: CommunityCapabilitiesResponse, userId: number, fallbackTtlSeconds?: number): void {
        this.userId = userId;
        this.stateSubject.next(state);
        const ttlSeconds = Math.max(1, (fallbackTtlSeconds ?? state.CacheTtlSegundos) || 300);
        this.expiresAt = Date.now() + ttlSeconds * 1000;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => this.ensure(userId, true).subscribe(), ttlSeconds * 1000);
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
