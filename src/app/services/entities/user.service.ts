import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiUserProfile, RecentLibraryActivity } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { PlatformSessionService } from '../auth/platform-session.service';
import { AdminAuditQuery, AdminAuditResponse, AdminRole, AdminSummary, AdminUserListResponse, AdminUsersQuery } from '../../interfaces/admin';

@Injectable({
    providedIn: 'root'
})
export class UserService extends ErrorHandlerService {
    constructor(private http: HttpClient, private sessionSrv: PlatformSessionService) {
        super();
    }

    getAdminUsers(query: AdminUsersQuery = {}): Observable<AdminUserListResponse> {
        if (this.sessionSrv.userRole.Nombre !== "administrador") return throwError('No tienes permisos');
        let params = new HttpParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '')
                params = params.set(key, String(value));
        });
        return this.http.get<AdminUserListResponse>(`${environment.apiUrl}admin/usuarios`, { params }).pipe(
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    getAdminSummary(): Observable<AdminSummary> {
        if (this.sessionSrv.userRole.Nombre !== 'administrador') return throwError('No tienes permisos');
        return this.http.get<{ success: boolean } & AdminSummary>(`${environment.apiUrl}admin/resumen`).pipe(
            catchError(error => this.errorHandle(error, 'Administración'))
        );
    }

    getAdminRoles(): Observable<AdminRole[]> {
        if (!this.sessionSrv.isAdmin) return throwError(() => new Error('No tienes permisos'));
        return this.http.get<{ success: boolean; Roles: AdminRole[] }>(`${environment.apiUrl}admin/roles`).pipe(map(response => response.Roles));
    }

    changeAdminUserRole(userId: number, roleId: number, reason: string): Observable<void> {
        if (!this.sessionSrv.isAdmin) return throwError(() => new Error('No tienes permisos'));
        return this.http.patch(`${environment.apiUrl}admin/usuarios/${userId}/rol`, { RolId: roleId, Motivo: reason }).pipe(map(() => void 0));
    }

    getAdminAudit(query: AdminAuditQuery = {}): Observable<AdminAuditResponse> {
        if (!this.sessionSrv.isAdmin) return throwError(() => new Error('No tienes permisos'));
        return this.http.get<AdminAuditResponse>(`${environment.apiUrl}admin/auditoria`, { params: this.params(query) });
    }

    /** El usuario local de Libros (`Id`, `Nombre` y `Role`); el perfil es de la plataforma (ADHESION_YOSIFTWARE.md). */
    getOwnProfile(): Observable<ApiUserProfile> {
        return this.http.get<{ success: boolean; user: ApiUserProfile }>(`${environment.apiUrl}usuarios/me`)
            .pipe(map(response => response.user));
    }

    getRecentLibraryActivity(limit: number = 4): Observable<RecentLibraryActivity[]> {
        return this.http.get<RecentLibraryActivity[]>(`${environment.apiUrl}biblioteca/actividad_reciente?limit=${limit}`);
    }

    private params(query: object): HttpParams {
        let params = new HttpParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '')
                params = params.set(key, String(value));
        });
        return params;
    }
}
