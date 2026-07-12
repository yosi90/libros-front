import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ClubDetail, ClubSummary, CommunityCursor, CommunityFeed, CommunityPost, CommunityUser } from '../../interfaces/community';

@Injectable({ providedIn: 'root' })
export class CommunityService {
    private readonly baseUrl = `${environment.apiUrl}comunidad`;

    constructor(private http: HttpClient) { }

    users(query = ''): Observable<CommunityUser[]> {
        const params = query.trim() ? new HttpParams().set('q', query.trim()) : undefined;
        return this.http.get<{ success: boolean; Usuarios: CommunityUser[] }>(`${this.baseUrl}/usuarios`, { params })
            .pipe(map(response => response.Usuarios));
    }

    feed(cursor?: CommunityCursor): Observable<CommunityFeed> {
        let params = new HttpParams().set('limit', 20);
        if (cursor)
            params = params.set('cursorFecha', cursor.FechaCreacion).set('cursorId', cursor.Id);

        return this.http.get<{ success: boolean; Publicaciones: CommunityPost[]; SiguienteCursor: CommunityCursor | null }>(`${this.baseUrl}/publicaciones`, { params })
            .pipe(map(({ Publicaciones, SiguienteCursor }) => ({ Publicaciones, SiguienteCursor })));
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
}
