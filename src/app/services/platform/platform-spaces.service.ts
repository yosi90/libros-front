import { Injectable, NgZone } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
    CanalDeEspacio,
    EspacioPlataforma,
    InvitacionEnviada,
    InvitacionRecibida,
    MensajeDelCanal,
    RolDeInvitacion,
    SolicitudDeEntrada
} from '../../interfaces/platform-spaces';
import { PlataformaPersona } from '../../interfaces/platform-person';
import { RECENT_ENTRY_MS } from '../../shared/club-spaces';
import { PlatformSessionService } from '../auth/platform-session.service';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { PlatformApiService } from './platform-api.service';

/** Un canal abierto por Libros: se cierra solo al salir del club o al cambiar de cuenta. */
export interface SpaceChannelHandle { close(): void }

/**
 * La pertenencia a los clubes es la de sus espacios en la plataforma (ESPACIOS.md; ADHESION_YOSIFTWARE.md, «Los
 * clubes»). Entrar, pedir entrar, invitar, aceptar, rechazar y salir los hace la persona con el token de la plataforma
 * (`/v1/espacios`, `PlatformApiService`: generación por cuenta y un reintento tras 401). El canal de cada espacio va
 * por el SDK (`yosiftware.espacios.canal`). Libros pinta su propia interfaz (`data-invitaciones="propias"`).
 *
 * Al cambiar de cuenta (CAMBIO_DE_CUENTA.md) `clear()` cierra los canales y olvida lo que sabe de la persona.
 */
@Injectable({ providedIn: 'root' })
export class PlatformSpacesService {
    private readonly channels = new Set<CanalDeEspacio>();
    /** Clubes en los que la persona acaba de entrar: el feed aún no se lo ha dicho a Libros. */
    private readonly recentEntries = new Map<number, number>();
    /** Espacios en los que la persona ha pedido entrar en esta carga (la plataforma no las lista). */
    private readonly ownRequests = new Map<number, { clubId: number | null; nombre: string; creada: string; mensaje: string | null }>();

    constructor(private api: PlatformApiService, private session: PlatformSessionService, private access: ModerationAccessService, private zone: NgZone) { }

    // ---- Espacios y miembros ----

    /** Los espacios de la persona en Libros (`GET /v1/espacios`), cada uno con `yo`. */
    mine(): Observable<EspacioPlataforma[]> {
        return this.api.get<{ espacios: EspacioPlataforma[] }>('/v1/espacios').pipe(map(response => response?.espacios ?? []));
    }

    /** Un espacio con lo de la persona en él (`yo`, sus capacidades). `404 espacio_no_encontrado` si no es miembro. */
    space(spaceId: number): Observable<EspacioPlataforma> {
        return this.api.get<EspacioPlataforma>(`/v1/espacios/${spaceId}`);
    }

    /** Entrar en un club abierto (`POST /v1/espacios/{id}/entrar`). */
    enter(spaceId: number, clubId: number): Observable<EspacioPlataforma> {
        return this.access.gate('clubes', true, this.api.post<EspacioPlataforma>(`/v1/espacios/${spaceId}/entrar`)).pipe(map(space => {
            this.markEntered(clubId);
            return space;
        }));
    }

    /** Salir (`DELETE /v1/espacios/{id}/miembros/yo`). La propiedad no puede: `409 propietario_no_puede_salir`. */
    leave(spaceId: number, clubId: number): Observable<void> {
        return this.api.delete<void>(`/v1/espacios/${spaceId}/miembros/yo`).pipe(map(() => { this.recentEntries.delete(clubId); }));
    }

    // ---- Solicitudes ----

    requestAccess(spaceId: number, club: { Id: number; Nombre: string }, message?: string): Observable<void> {
        const mensaje = message?.trim() || null;
        return this.access.gate('clubes', true, this.api.post<unknown>(`/v1/espacios/${spaceId}/solicitudes`, mensaje ? { mensaje } : {})).pipe(map(() => {
            this.ownRequests.set(spaceId, { clubId: club.Id, nombre: club.Nombre, creada: new Date().toISOString(), mensaje });
        }));
    }

    withdrawRequest(spaceId: number): Observable<void> {
        return this.api.delete<void>(`/v1/espacios/${spaceId}/solicitudes/mia`).pipe(map(() => { this.ownRequests.delete(spaceId); }));
    }

    hasOwnRequest(spaceId: number | null | undefined): boolean {
        return !!spaceId && this.ownRequests.has(spaceId);
    }

    /** Las solicitudes que la persona ha enviado en esta carga de la página, para el centro de acceso. */
    ownRequestsSent(): Array<{ espacioId: number; clubId: number | null; nombre: string; creada: string; mensaje: string | null }> {
        return [...this.ownRequests.entries()].map(([espacioId, request]) => ({ espacioId, ...request }));
    }

    forgetOwnRequest(spaceId: number): void { this.ownRequests.delete(spaceId); }

    joinRequests(spaceId: number): Observable<SolicitudDeEntrada[]> {
        return this.api.get<{ solicitudes: SolicitudDeEntrada[] }>(`/v1/espacios/${spaceId}/solicitudes`).pipe(map(response => response?.solicitudes ?? []));
    }

    resolveJoinRequest(spaceId: number, requestId: number, decision: 'aprobar' | 'rechazar'): Observable<void> {
        return this.access.gate('clubes', true, this.api.post<void>(`/v1/espacios/${spaceId}/solicitudes/${requestId}/${decision}`));
    }

    // ---- Invitaciones ----

    /** Buscar personas para invitar (`GET /v1/personas?q=`, de 2 a 60 caracteres; nunca una misma ni un bloqueo). */
    searchPeople(query: string): Observable<PlataformaPersona[]> {
        return this.api.get<{ personas: PlataformaPersona[] }>('/v1/personas', { q: query.trim() }).pipe(map(response => response?.personas ?? []));
    }

    invite(spaceId: number, target: { cuenta: string } | { correo: string }, role?: RolDeInvitacion): Observable<InvitacionEnviada> {
        return this.access.gate('clubes', true, this.api.post<InvitacionEnviada>(`/v1/espacios/${spaceId}/invitaciones`, { ...target, ...(role ? { rol: role } : {}) }));
    }

    sentInvitations(spaceId: number): Observable<InvitacionEnviada[]> {
        return this.api.get<{ invitaciones: InvitacionEnviada[] }>(`/v1/espacios/${spaceId}/invitaciones`).pipe(map(response => response?.invitaciones ?? []));
    }

    withdrawInvitation(spaceId: number, invitationId: number): Observable<void> {
        return this.api.delete<void>(`/v1/espacios/${spaceId}/invitaciones/${invitationId}`);
    }

    /** Las invitaciones pendientes de la persona, también las de sus correos confirmados. */
    myInvitations(): Observable<InvitacionRecibida[]> {
        return this.api.get<{ invitaciones: InvitacionRecibida[] }>('/v1/espacios/invitaciones').pipe(map(response => response?.invitaciones ?? []));
    }

    /** La invitación del enlace de un correo (`#yosi-invitacion=<código>`), si es para esta persona. */
    invitationByCode(code: string): Observable<InvitacionRecibida> {
        return this.api.post<InvitacionRecibida>('/v1/espacios/invitaciones/por-codigo', { codigo: code });
    }

    acceptByCode(code: string): Observable<EspacioPlataforma> {
        return this.access.gate('clubes', true, this.api.post<EspacioPlataforma>('/v1/espacios/invitaciones/por-codigo/aceptar', { codigo: code }));
    }

    accept(invitationId: number): Observable<EspacioPlataforma> {
        return this.access.gate('clubes', true, this.api.post<EspacioPlataforma>(`/v1/espacios/invitaciones/${invitationId}/aceptar`));
    }

    reject(invitationId: number): Observable<void> {
        return this.api.post<void>(`/v1/espacios/invitaciones/${invitationId}/rechazar`);
    }

    // ---- El retraso del feed ----

    /** La persona acaba de entrar en el club: durante unos minutos, un 404 del club no lo da por inaccesible. */
    markEntered(clubId: number | null | undefined): void {
        if (clubId) this.recentEntries.set(clubId, Date.now());
    }

    isRecentEntry(clubId: number): boolean {
        const at = this.recentEntries.get(clubId);
        if (at === undefined) return false;
        if (Date.now() - at > RECENT_ENTRY_MS) {
            this.recentEntries.delete(clubId);
            return false;
        }
        return true;
    }

    forgetEntry(clubId: number): void { this.recentEntries.delete(clubId); }

    // ---- El canal ----

    /**
     * Abre el canal de tiempo real del espacio (`yosiftware.espacios.canal`). Lo que llegue con otra cuenta se descarta;
     * al cambiar de cuenta se cierra (`clear()`).
     */
    openChannel(spaceId: number, listener: (message: MensajeDelCanal) => void): SpaceChannelHandle {
        const generation = this.session.generation;
        let channel: CanalDeEspacio | null = null;
        let closed = false;
        const close = () => {
            closed = true;
            if (!channel) return;
            this.channels.delete(channel);
            try { channel.cerrar(); } catch { /* el SDK ya lo cerró */ }
            channel = null;
        };
        void this.session.platformSdk().then(sdk => {
            if (closed || !this.session.isCurrentGeneration(generation)) return;
            channel = sdk.espacios.canal(spaceId, message => {
                if (closed || !this.session.isCurrentGeneration(generation)) return;
                this.zone.run(() => listener(message));
            });
            this.channels.add(channel);
        }).catch(() => { /* sin SDK no hay canal: el club se sigue leyendo por REST */ });
        return { close };
    }

    get openChannels(): number { return this.channels.size; }

    /** Cambio de cuenta: se cierran los canales y se olvida lo de la persona. */
    clear(): void {
        for (const channel of this.channels) {
            try { channel.cerrar(); } catch { /* el SDK ya lo cerró */ }
        }
        this.channels.clear();
        this.recentEntries.clear();
        this.ownRequests.clear();
    }
}
