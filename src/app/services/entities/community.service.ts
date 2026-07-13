import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ClubCreateRequest, ClubDetail, ClubMilestone, ClubMilestoneCreateRequest, ClubProgress, ClubReading, ClubSummary, CommunityCommentPage, CommunityCursor, CommunityFeed, CommunityFriendRequestPage, CommunityPost, CommunityPostCreateRequest, CommunityRelationshipKind, CommunityRelationshipPage, CommunityRelationshipStatus, CommunityUser } from '../../interfaces/community';

@Injectable({ providedIn: 'root' })
export class CommunityService {
    private readonly baseUrl = `${environment.apiUrl}comunidad`;

    constructor(private http: HttpClient) { }

    users(query = ''): Observable<CommunityUser[]> {
        const params = query.trim() ? new HttpParams().set('q', query.trim()) : undefined;
        return this.http.get<{ success: boolean; Usuarios: CommunityUser[] }>(`${this.baseUrl}/usuarios`, { params })
            .pipe(map(response => response.Usuarios));
    }

    user(id: number): Observable<CommunityUser> {
        return this.http.get<{ success: boolean; Usuario: CommunityUser }>(`${this.baseUrl}/usuarios/${id}`)
            .pipe(map(response => response.Usuario));
    }

    relationships(kind: CommunityRelationshipKind, afterId?: number): Observable<CommunityRelationshipPage> {
        let params = new HttpParams().set('limit', 50);
        if (afterId)
            params = params.set('afterId', afterId);
        return this.http.get<{ success: boolean; Relaciones: CommunityRelationshipPage['Relaciones']; SiguienteAfterId: number | null }>(`${this.baseUrl}/relaciones/${kind}`, { params })
            .pipe(map(({ Relaciones, SiguienteAfterId }) => ({ Relaciones, SiguienteAfterId })));
    }

    friendRequests(direction: 'recibidas' | 'enviadas', afterId?: number): Observable<CommunityFriendRequestPage> {
        let params = new HttpParams().set('tipo', direction).set('limit', 50);
        if (afterId)
            params = params.set('afterId', afterId);
        return this.http.get<{ success: boolean; Solicitudes: CommunityFriendRequestPage['Solicitudes']; SiguienteAfterId: number | null }>(`${this.baseUrl}/amistades/solicitudes`, { params })
            .pipe(map(({ Solicitudes, SiguienteAfterId }) => ({ Solicitudes, SiguienteAfterId })));
    }

    relationship(userId: number): Observable<CommunityRelationshipStatus> {
        return this.http.get<{ success: boolean } & CommunityRelationshipStatus>(`${this.baseUrl}/usuarios/${userId}/relacion`)
            .pipe(map(({ success: _success, ...relationship }) => relationship));
    }

    feed(cursor?: CommunityCursor): Observable<CommunityFeed> {
        let params = new HttpParams().set('limit', 20);
        if (cursor)
            params = params.set('cursorFecha', cursor.FechaCreacion).set('cursorId', cursor.Id);

        return this.http.get<{ success: boolean; Publicaciones: CommunityPost[]; SiguienteCursor: CommunityCursor | null }>(`${this.baseUrl}/publicaciones`, { params })
            .pipe(map(({ Publicaciones, SiguienteCursor }) => ({ Publicaciones, SiguienteCursor })));
    }

    createPost(request: CommunityPostCreateRequest): Observable<void> {
        return this.http.post(`${this.baseUrl}/publicaciones`, request).pipe(map(() => void 0));
    }

    reactToPost(id: number, type: 'me_gusta' | 'util' | 'emociona' = 'me_gusta'): Observable<void> {
        return this.http.put(`${this.baseUrl}/publicaciones/${id}/reacciones`, { Tipo: type }).pipe(map(() => void 0));
    }

    comments(postId: number, cursor?: CommunityCursor): Observable<CommunityCommentPage> {
        let params = new HttpParams().set('limit', 20);
        if (cursor)
            params = params.set('cursorFecha', cursor.FechaCreacion).set('cursorId', cursor.Id);

        return this.http.get<{ success: boolean; Comentarios: CommunityCommentPage['Comentarios']; SiguienteCursor: CommunityCursor | null }>(`${this.baseUrl}/publicaciones/${postId}/comentarios`, { params })
            .pipe(map(({ Comentarios, SiguienteCursor }) => ({ Comentarios, SiguienteCursor })));
    }

    createComment(postId: number, content: string): Observable<void> {
        return this.http.post(`${this.baseUrl}/publicaciones/${postId}/comentarios`, { ContenidoMarkdown: content }).pipe(map(() => void 0));
    }

    updatePost(id: number, request: Pick<CommunityPostCreateRequest, 'Titulo' | 'ContenidoMarkdown'>): Observable<void> {
        return this.http.patch(`${this.baseUrl}/publicaciones/${id}`, request).pipe(map(() => void 0));
    }

    deletePost(id: number): Observable<void> {
        return this.http.delete(`${this.baseUrl}/publicaciones/${id}`).pipe(map(() => void 0));
    }

    updateComment(postId: number, commentId: number, content: string): Observable<void> {
        return this.http.patch(`${this.baseUrl}/publicaciones/${postId}/comentarios/${commentId}`, { ContenidoMarkdown: content }).pipe(map(() => void 0));
    }

    deleteComment(postId: number, commentId: number): Observable<void> {
        return this.http.delete(`${this.baseUrl}/publicaciones/${postId}/comentarios/${commentId}`).pipe(map(() => void 0));
    }

    followUser(userId: number): Observable<void> {
        return this.http.post(`${this.baseUrl}/seguimientos`, { UsuarioId: userId }).pipe(map(() => void 0));
    }

    unfollowUser(userId: number): Observable<void> {
        return this.http.delete(`${this.baseUrl}/seguimientos`, { body: { UsuarioId: userId } }).pipe(map(() => void 0));
    }

    requestFriendship(userId: number): Observable<void> {
        return this.http.post(`${this.baseUrl}/amistades/solicitudes`, { UsuarioId: userId }).pipe(map(() => void 0));
    }

    blockUser(userId: number): Observable<void> {
        return this.http.post(`${this.baseUrl}/bloqueos`, { UsuarioId: userId }).pipe(map(() => void 0));
    }

    unblockUser(userId: number): Observable<void> {
        return this.http.delete(`${this.baseUrl}/bloqueos`, { body: { UsuarioId: userId } }).pipe(map(() => void 0));
    }

    resolveFriendshipRequest(id: number, state: 'aceptada' | 'rechazada'): Observable<void> {
        return this.http.patch(`${this.baseUrl}/amistades/solicitudes/${id}`, { Estado: state }).pipe(map(() => void 0));
    }

    clubs(): Observable<ClubSummary[]> {
        return this.http.get<{ success: boolean; Clubes: ClubSummary[] }>(`${environment.apiUrl}clubes-lectura`)
            .pipe(map(response => response.Clubes));
    }

    club(id: number): Observable<ClubDetail> {
        return this.http.get<{ success: boolean; Club: ClubDetail }>(`${environment.apiUrl}clubes-lectura/${id}`)
            .pipe(map(response => response.Club));
    }

    joinClub(id: number): Observable<void> {
        return this.http.post(`${environment.apiUrl}clubes-lectura/${id}/unirse`, {}).pipe(map(() => void 0));
    }

    requestClubAccess(id: number): Observable<void> {
        return this.http.post(`${environment.apiUrl}clubes-lectura/${id}/solicitudes`, {}).pipe(map(() => void 0));
    }

    clubReadings(id: number): Observable<ClubReading[]> {
        return this.http.get<{ success: boolean; Lecturas: ClubReading[] }>(`${environment.apiUrl}clubes-lectura/${id}/lecturas`)
            .pipe(map(response => response.Lecturas));
    }

    createClub(request: ClubCreateRequest): Observable<number> {
        return this.http.post<{ success: boolean; Id: number }>(`${environment.apiUrl}clubes-lectura`, request).pipe(map(response => response.Id));
    }

    clubProgress(id: number): Observable<ClubProgress[]> {
        return this.http.get<{ success: boolean; Progresos: ClubProgress[] }>(`${environment.apiUrl}clubes-lectura/${id}/progreso`).pipe(map(response => response.Progresos));
    }

    saveClubProgress(id: number, progress: Pick<ClubProgress, 'LecturaId' | 'PaginaActual' | 'CapituloActual' | 'Compartir'>): Observable<void> {
        return this.http.put(`${environment.apiUrl}clubes-lectura/${id}/progreso`, progress).pipe(map(() => void 0));
    }

    clubMilestones(id: number): Observable<ClubMilestone[]> {
        return this.http.get<{ success: boolean; Hitos: ClubMilestone[] }>(`${environment.apiUrl}clubes-lectura/${id}/hitos`, { params: new HttpParams().set('limit', 50) }).pipe(map(response => response.Hitos));
    }

    createClubMilestone(id: number, request: ClubMilestoneCreateRequest): Observable<void> {
        return this.http.post(`${environment.apiUrl}clubes-lectura/${id}/hitos`, request).pipe(map(() => void 0));
    }
}
