import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { User } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { UpdateResponse } from '../../interfaces/user-update-response';

@Injectable({
    providedIn: 'root'
})
export class UserService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'auth/';

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllUsers(): Observable<User[]> {
        if (this.sessionSrv.userRole.Nombre !== "administrador") return throwError('No tienes permisos');
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.get<User[]>(`${environment.apiUrl}user`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Usuario'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateName(name: string): Observable<UpdateResponse> {
        return this.http.put<UpdateResponse>(this.apiUrl + 'update', { name });
    }

    updateEmail(email: string): Observable<UpdateResponse> {
        return this.http.put<UpdateResponse>(this.apiUrl + 'update', { email });
    }

    updatePassword(password: string, password_old: string): Observable<UpdateResponse> {
        return this.http.put<UpdateResponse>(this.apiUrl + 'update', { password, password_old });
    }

    updateImg(imageFile: File): Observable<UpdateResponse> {
        const image = this.sessionSrv.userId + '.png';
        const formData = new FormData();
        formData.append('image', imageFile);

        return this.http.post<UpdateResponse>(`${environment.apiUrl}image/set/photo/${image}`, formData).pipe(
            switchMap(responseImage => {
                if (responseImage.success) {
                    return this.http.put<UpdateResponse>(`${this.apiUrl}update`, { image });
                } else {
                    return throwError(() => new Error(responseImage.message));
                }
            }),
            catchError(error => this.errorHandle(error, 'Usuario'))
        );
    }
}
