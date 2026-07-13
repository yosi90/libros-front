import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { RecentLibraryActivity, User, UserProfileUpdate } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { UpdateResponse } from '../../interfaces/user-update-response';
import { AdminSummary, AdminUserListResponse, AdminUsersQuery, ModerationUserListResponse } from '../../interfaces/admin';

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
}
