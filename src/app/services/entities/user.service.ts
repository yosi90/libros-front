import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { RecentLibraryActivity, User, UserProfileUpdate } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { UpdateResponse } from '../../interfaces/user-update-response';
import { AdminAuditQuery, AdminAuditResponse, AdminRole, AdminSummary, AdminUser, AdminUserDetailQuery, AdminUserDetailResponse, AdminUserListResponse, AdminUsersQuery, ModerationUser, ModerationUserListResponse } from '../../interfaces/admin';

@Injectable({
    providedIn: 'root'
})
export class UserService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'auth/';

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
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

    getModerationUsers(query: AdminUsersQuery = {}): Observable<ModerationUserListResponse> {
        if (!['administrador', 'moderador'].includes(this.sessionSrv.userRole.Nombre)) return throwError('No tienes permisos');
        let params = new HttpParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '')
                params = params.set(key, String(value));
        });
        return this.http.get<ModerationUserListResponse>(`${environment.apiUrl}moderacion/usuarios`, { params }).pipe(
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }

    getAdminUser(userId: number, query: AdminUserDetailQuery = {}): Observable<AdminUserDetailResponse<AdminUser>> {
        if (!this.sessionSrv.isAdmin) return throwError(() => new Error('No tienes permisos'));
        return this.http.get<AdminUserDetailResponse<AdminUser>>(`${environment.apiUrl}admin/usuarios/${userId}`, { params: this.params(query) });
    }

    getModerationUser(userId: number, query: AdminUserDetailQuery = {}): Observable<AdminUserDetailResponse<ModerationUser>> {
        if (!this.sessionSrv.canModerateCatalog) return throwError(() => new Error('No tienes permisos'));
        return this.http.get<AdminUserDetailResponse<ModerationUser>>(`${environment.apiUrl}moderacion/usuarios/${userId}`, { params: this.params(query) });
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

    updateName(name: string): Observable<UpdateResponse> {
        return this.updateProfile({ name });
    }

    updateEmail(email: string): Observable<UpdateResponse> {
        return this.updateProfile({ email });
    }

    updatePassword(password: string, password_old: string): Observable<UpdateResponse> {
        return this.http.put<UpdateResponse>(this.apiUrl + 'update', { password, password_old });
    }

    updateProfile(profile: UserProfileUpdate): Observable<UpdateResponse> {
        return this.http.put<UpdateResponse>(this.apiUrl + 'update', profile);
    }

    getRecentLibraryActivity(limit: number = 4): Observable<RecentLibraryActivity[]> {
        return this.http.get<RecentLibraryActivity[]>(`${environment.apiUrl}biblioteca/actividad_reciente?limit=${limit}`);
    }

    updateImg(imageFile: File): Observable<UpdateResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);

        return this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/photo`, formData).pipe(
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
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
