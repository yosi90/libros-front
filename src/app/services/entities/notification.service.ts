import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AppNotification, NotificationCategory, NotificationCursor, NotificationList, NotificationPreference } from '../../interfaces/notification';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly baseUrl = `${environment.apiUrl}notificaciones`;

    constructor(private http: HttpClient) { }

    list(options: { limit?: number; cursor?: NotificationCursor; category?: NotificationCategory; read?: 'todas' | 'leidas' | 'no_leidas' } = {}): Observable<NotificationList> {
        let params = new HttpParams();
        if (options.limit) params = params.set('limit', options.limit);
        if (options.cursor) params = params.set('cursorFecha', options.cursor.FechaCreacion).set('cursorId', options.cursor.Id);
        if (options.category) params = params.set('categoria', options.category);
        if (options.read) params = params.set('lectura', options.read);

        return this.http.get<{ success: boolean; Notificaciones: AppNotification[]; NoLeidas: number; SiguienteCursor: NotificationCursor | null }>(this.baseUrl, { params })
            .pipe(map(({ Notificaciones, NoLeidas, SiguienteCursor }) => ({ Notificaciones, NoLeidas, SiguienteCursor })));
    }

    markRead(id: number): Observable<void> {
        return this.http.post(`${this.baseUrl}/${id}/leer`, {}).pipe(map(() => void 0));
    }

    markAllRead(): Observable<void> {
        return this.http.post(`${this.baseUrl}/leer-todas`, {}).pipe(map(() => void 0));
    }

    markBatchRead(ids: number[]): Observable<void> {
        return this.http.post(`${this.baseUrl}/leer-lote`, { Ids: ids }).pipe(map(() => void 0));
    }

    preferences(): Observable<NotificationPreference[]> {
        return this.http.get<{ success: boolean; Preferencias: NotificationPreference[] }>(`${this.baseUrl}/preferencias`)
            .pipe(map(response => response.Preferencias));
    }

    savePreferences(preferences: NotificationPreference[]): Observable<void> {
        return this.http.put(`${this.baseUrl}/preferencias`, { Preferencias: preferences }).pipe(map(() => void 0));
    }

    registerDevice(token: string): Observable<number> {
        return this.http.post<{ success: boolean; Id: number }>(`${this.baseUrl}/dispositivos`, { Token: token, Plataforma: 'web' })
            .pipe(map(response => response.Id));
    }

    revokeDevice(id: number): Observable<void> {
        return this.http.delete(`${this.baseUrl}/dispositivos/${id}`).pipe(map(() => void 0));
    }
}
