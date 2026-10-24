import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ClubAccessDirection, ClubCalendarEvent, ClubCalendarEventCreateRequest, ClubCreateRequest, ClubDebate, ClubDebateDetail, ClubDetail, ClubDiscoveryCursor, ClubDiscoveryPage, ClubInboxCursor, ClubInboxFilterState, ClubInvitationCandidateCursor, ClubInvitationCandidatePage, ClubInvitationPage, ClubJoinRequestOwnPage, ClubJoinRequestPage, ClubMilestone, ClubMilestoneCreateRequest, ClubPoll, ClubProgress, ClubReading, ClubSocialSummary, ClubSpoiler, ClubSummary, ClubUpcomingEvent, ClubUpcomingEventCursor, MyClubSummary } from '../../interfaces/community';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { SocialSummary } from '../../interfaces/chat';

@Injectable({ providedIn: 'root' })
export class CommunityService {
    private readonly baseUrl = `${environment.apiUrl}comunidad`;

    constructor(private http: HttpClient, private access: ModerationAccessService) { }

    socialSummary(): Observable<SocialSummary> {
        return this.http.get<{ success: boolean } & SocialSummary>(`${this.baseUrl}/resumen`)
            .pipe(map(({ Parcial, BloquesFallidos, Resumen }) => ({ Parcial, BloquesFallidos, Resumen })));
    }

    /**
     * La denuncia propia de Libros: los clubes, y sus publicaciones y comentarios. Las de personas y mensajes son de la
     * plataforma (`yosiftware.denunciar`, MODERACION.md).
     */
    report(type: 'publicacion' | 'comentario' | 'club', entityId: number, reason: string): Observable<number> {
        return this.http.post<{ success: boolean; GrupoId: number }>(`${this.baseUrl}/denuncias`, { TipoEntidad: type, EntidadId: entityId, Motivo: reason }).pipe(map(response => response.GrupoId));
    }

    clubs(): Observable<ClubSummary[]> {
        return this.http.get<{ success: boolean; Clubes: ClubSummary[] }>(`${environment.apiUrl}clubes-lectura`)
            .pipe(map(response => response.Clubes));
    }

    clubSocialSummary(): Observable<ClubSocialSummary> {
        return this.http.get<{ success: boolean } & ClubSocialSummary>(`${environment.apiUrl}clubes-lectura/resumen`)
            .pipe(map(({ TieneClubes, ClubesPropios, ProximosEventos, ClubesPublicosActivos, BandejasAcceso }) => ({
                TieneClubes,
                ClubesPropios,
                ProximosEventos,
                ClubesPublicosActivos,
                BandejasAcceso: BandejasAcceso ?? {
                    Solicitudes: { EnviadasPendientes: 0, RecibidasPendientes: 0 },
                    Invitaciones: { EnviadasPendientes: 0, RecibidasPendientes: 0 }
                }
            })));
    }

    myClubs(): Observable<{ TieneClubes: boolean; Total: number; Clubes: MyClubSummary[] }> {
        return this.http.get<{ success: boolean; TieneClubes: boolean; Total: number; Clubes: MyClubSummary[] }>(`${environment.apiUrl}clubes-lectura/mios`)
            .pipe(map(({ TieneClubes, Total, Clubes }) => ({ TieneClubes, Total, Clubes })));
    }

    myUpcomingClubEvents(cursor?: ClubUpcomingEventCursor): Observable<{ Eventos: ClubUpcomingEvent[]; SiguienteCursor: ClubUpcomingEventCursor | null }> {
        let params = new HttpParams().set('limit', 20);
        if (cursor) params = params.set('cursorFechaInicio', cursor.cursorFechaInicio).set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean; Eventos: ClubUpcomingEvent[]; SiguienteCursor: ClubUpcomingEventCursor | null }>(`${environment.apiUrl}clubes-lectura/mios/eventos/proximos`, { params })
            .pipe(map(({ Eventos, SiguienteCursor }) => ({ Eventos, SiguienteCursor })));
    }

    discoverClubs(filters: { query?: string; targetType?: ClubReading['Objetivo']['Tipo']; targetId?: number }, cursor?: ClubDiscoveryCursor): Observable<ClubDiscoveryPage> {
        let params = new HttpParams().set('limit', 20);
        if (filters.query?.trim()) params = params.set('q', filters.query.trim());
        if (filters.targetType && filters.targetId) params = params.set('tipoObjetivo', filters.targetType).set('objetivoId', filters.targetId);
        if (cursor) params = params.set('cursorFecha', cursor.cursorFecha).set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean } & ClubDiscoveryPage>(`${environment.apiUrl}clubes-lectura`, { params }).pipe(map(({ Clubes, SiguienteCursor }) => ({ Clubes, SiguienteCursor })));
    }

    club(id: number): Observable<ClubDetail> {
        return this.http.get<{ success: boolean; Club: ClubDetail }>(`${environment.apiUrl}clubes-lectura/${id}`)
            .pipe(map(response => response.Club));
    }

    joinClub(id: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/unirse`, {}).pipe(map(() => void 0)));
    }

    requestClubAccess(id: number, message?: string): Observable<void> {
        const normalizedMessage = message?.trim();
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/solicitudes`, normalizedMessage ? { Mensaje: normalizedMessage } : {}).pipe(map(() => void 0)));
    }

    clubInvitations(direction: ClubAccessDirection, state: ClubInboxFilterState = 'pendiente', cursor?: ClubInboxCursor): Observable<ClubInvitationPage> {
        let params = new HttpParams().set('direccion', direction).set('estado', state).set('limit', 20);
        if (cursor) params = params.set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean } & ClubInvitationPage>(`${environment.apiUrl}bandejas/clubes/invitaciones`, { params }).pipe(map(({ Direccion, Invitaciones, SiguienteCursor }) => ({ Direccion, Invitaciones, SiguienteCursor } as ClubInvitationPage)));
    }

    ownClubJoinRequests(direction: ClubAccessDirection, state: ClubInboxFilterState = 'pendiente', cursor?: ClubInboxCursor): Observable<ClubJoinRequestOwnPage> {
        let params = new HttpParams().set('direccion', direction).set('estado', state).set('limit', 20);
        if (cursor) params = params.set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean } & ClubJoinRequestOwnPage>(`${environment.apiUrl}bandejas/clubes/solicitudes`, { params }).pipe(map(({ Direccion, Solicitudes, SiguienteCursor }) => ({ Direccion, Solicitudes, SiguienteCursor } as ClubJoinRequestOwnPage)));
    }

    cancelOwnClubJoinRequest(requestId: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.patch(`${environment.apiUrl}bandejas/clubes/solicitudes/${requestId}`, { Estado: 'cancelada' }).pipe(map(() => void 0)));
    }

    cancelClubInvitation(invitationId: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.patch(`${environment.apiUrl}bandejas/clubes/invitaciones/${invitationId}`, { Estado: 'cancelada' }).pipe(map(() => void 0)));
    }

    resolveClubInvitation(clubId: number, invitationId: number, state: 'aceptada' | 'rechazada'): Observable<void> {
        return this.access.gate('clubes', true, this.http.patch(`${environment.apiUrl}clubes-lectura/${clubId}/invitaciones/${invitationId}`, { Estado: state }).pipe(map(() => void 0)));
    }

    clubJoinRequests(id: number, cursor?: ClubInboxCursor): Observable<ClubJoinRequestPage> {
        let params = new HttpParams().set('estado', 'pendiente').set('limit', 20);
        if (cursor) params = params.set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean } & ClubJoinRequestPage>(`${environment.apiUrl}clubes-lectura/${id}/solicitudes`, { params }).pipe(map(({ Solicitudes, SiguienteCursor }) => ({ Solicitudes, SiguienteCursor })));
    }

    resolveClubJoinRequest(id: number, requestId: number, state: 'aceptada' | 'rechazada'): Observable<void> {
        return this.access.gate('clubes', true, this.http.patch(`${environment.apiUrl}clubes-lectura/${id}/solicitudes/${requestId}`, { Estado: state }).pipe(map(() => void 0)));
    }

    inviteToClub(id: number, userId: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/invitaciones`, { UsuarioId: userId }).pipe(map(() => void 0)));
    }

    clubInvitationCandidates(id: number, query = '', cursor?: ClubInvitationCandidateCursor): Observable<ClubInvitationCandidatePage> {
        let params = new HttpParams().set('limit', 20);
        if (query.trim()) params = params.set('q', query.trim());
        if (cursor) params = params
            .set('cursorTipo', cursor.cursorTipo)
            .set('cursorNombre', cursor.cursorNombre)
            .set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean } & ClubInvitationCandidatePage>(`${environment.apiUrl}clubes-lectura/${id}/invitaciones/candidatos`, { params })
            .pipe(map(({ Candidatos, SiguienteCursor }) => ({ Candidatos, SiguienteCursor })));
    }

    changeClubMemberRole(id: number, userId: number, role: 'moderador' | 'miembro'): Observable<void> {
        return this.access.gate('clubes', true, this.http.patch(`${environment.apiUrl}clubes-lectura/${id}/miembros/${userId}`, { Rol: role }).pipe(map(() => void 0)));
    }

    removeClubMember(id: number, userId: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.delete(`${environment.apiUrl}clubes-lectura/${id}/miembros/${userId}`).pipe(map(() => void 0)));
    }

    leaveClub(id: number): Observable<void> {
        return this.http.post(`${environment.apiUrl}clubes-lectura/${id}/salir`, {}).pipe(map(() => void 0));
    }

    deleteClub(id: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.delete(`${environment.apiUrl}clubes-lectura/${id}`).pipe(map(() => void 0)));
    }

    restoreClub(id: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/restaurar`, {}).pipe(map(() => void 0)));
    }

    clubReadings(id: number): Observable<ClubReading[]> {
        return this.http.get<{ success: boolean; Lecturas: ClubReading[] }>(`${environment.apiUrl}clubes-lectura/${id}/lecturas`)
            .pipe(map(response => response.Lecturas));
    }

    setCurrentClubReading(id: number, request: { Objetivo: { Tipo: ClubReading['Objetivo']['Tipo']; Id: number }; FechaInicio?: string; FechaFin?: string; ObjetivoTexto?: string }): Observable<void> {
        return this.access.gate('clubes', true, this.http.put(`${environment.apiUrl}clubes-lectura/${id}/lectura-actual`, request).pipe(map(() => void 0)));
    }

    createClub(request: ClubCreateRequest): Observable<number> {
        return this.access.gate('clubes', true, this.http.post<{ success: boolean; Id: number }>(`${environment.apiUrl}clubes-lectura`, request).pipe(map(response => response.Id)));
    }

    clubProgress(id: number): Observable<ClubProgress[]> {
        return this.http.get<{ success: boolean; Progresos: ClubProgress[] }>(`${environment.apiUrl}clubes-lectura/${id}/progreso`).pipe(map(response => response.Progresos));
    }

    saveClubProgress(id: number, progress: Pick<ClubProgress, 'LecturaId' | 'PaginaActual' | 'CapituloActual' | 'Compartir'>): Observable<void> {
        return this.access.gate('clubes', true, this.http.put(`${environment.apiUrl}clubes-lectura/${id}/progreso`, progress).pipe(map(() => void 0)));
    }

    clubMilestones(id: number): Observable<ClubMilestone[]> {
        return this.http.get<{ success: boolean; Hitos: ClubMilestone[] }>(`${environment.apiUrl}clubes-lectura/${id}/hitos`, { params: new HttpParams().set('limit', 50) }).pipe(map(response => response.Hitos));
    }

    createClubMilestone(id: number, request: ClubMilestoneCreateRequest): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/hitos`, request).pipe(map(() => void 0)));
    }

    clubCalendar(id: number): Observable<ClubCalendarEvent[]> {
        return this.http.get<{ success: boolean; Eventos: ClubCalendarEvent[] }>(`${environment.apiUrl}clubes-lectura/${id}/eventos`, { params: new HttpParams().set('limit', 100) }).pipe(map(response => response.Eventos));
    }

    createClubCalendarEvent(id: number, request: ClubCalendarEventCreateRequest): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/eventos`, request).pipe(map(() => void 0)));
    }

    deleteClubCalendarEvent(id: number, eventId: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.delete(`${environment.apiUrl}clubes-lectura/${id}/eventos/${eventId}`).pipe(map(() => void 0)));
    }

    clubDebates(id: number, revealSpoilers = false): Observable<ClubDebate[]> {
        let params = new HttpParams().set('limit', 100);
        if (revealSpoilers) params = params.set('revelarSpoilers', true);
        return this.http.get<{ success: boolean; Debates: ClubDebate[] }>(`${environment.apiUrl}clubes-lectura/${id}/debates`, { params }).pipe(map(response => response.Debates));
    }

    clubDebate(id: number, debateId: number, revealSpoilers = false): Observable<ClubDebateDetail> {
        const params = revealSpoilers ? new HttpParams().set('revelarSpoilers', true) : undefined;
        return this.http.get<{ success: boolean } & ClubDebateDetail>(`${environment.apiUrl}clubes-lectura/${id}/debates/${debateId}`, { params }).pipe(map(({ Debate, Comentarios }) => ({ Debate, Comentarios })));
    }

    createClubDebate(id: number, request: { Titulo: string; ContenidoMarkdown: string; LecturaId?: number; HitoId?: number; Spoiler?: ClubSpoiler }): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/debates`, request).pipe(map(() => void 0)));
    }

    commentClubDebate(id: number, debateId: number, content: string, spoiler?: ClubSpoiler): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/debates/${debateId}`, { ContenidoMarkdown: content, ...(spoiler ? { Spoiler: spoiler } : {}) }).pipe(map(() => void 0)));
    }

    clubPolls(id: number): Observable<ClubPoll[]> {
        return this.http.get<{ success: boolean; Encuestas: ClubPoll[] }>(`${environment.apiUrl}clubes-lectura/${id}/encuestas`, { params: new HttpParams().set('limit', 100) }).pipe(map(response => response.Encuestas));
    }

    createClubPoll(id: number, question: string, options: string[], closingDate: string): Observable<void> {
        return this.access.gate('clubes', true, this.http.post(`${environment.apiUrl}clubes-lectura/${id}/encuestas`, { Pregunta: question, Opciones: options, FechaCierre: closingDate }).pipe(map(() => void 0)));
    }

    voteClubPoll(id: number, pollId: number, optionId: number, version?: number): Observable<void> {
        return this.access.gate('clubes', true, this.http.put(`${environment.apiUrl}clubes-lectura/${id}/encuestas/${pollId}/voto`, { OpcionId: optionId, ...(version !== undefined ? { Version: version } : {}) }).pipe(map(() => void 0)));
    }
}
