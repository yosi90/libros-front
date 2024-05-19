import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { User } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { jwtDecode } from 'jwt-decode';
import { UserT } from '../../interfaces/askers/user-t';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class UserService extends ErrorHandlerService {

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllUsers(): Observable<User[]> {
        if(!this.sessionSrv.isAdmin) return throwError('No tienes permisos');
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.get<User[]>(`${environment.apiUrl}user`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Usuario'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    update(userNew: UserT): Observable<any> {
        try {
            const decodedToken = jwtDecode(this.sessionSrv.token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.put<User>(`${environment.apiUrl}user/${userId}`, userNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateImg(image: File): Observable<User> {
        try {
            const decodedToken = jwtDecode(this.sessionSrv.token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const formData: FormData = new FormData();
            formData.append('image', image);
            const headers = new HttpHeaders({
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.patch<User>(`${environment.apiUrl}user/${userId}/image`, formData, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateName(nameNew: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(this.sessionSrv.token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.patch<User>(`${environment.apiUrl}user/${userId}/name`, nameNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateEmail(emailNew: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(this.sessionSrv.token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.patch<User>(`${environment.apiUrl}user/${userId}/email`, emailNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updatePassword(passwordNew: string, passwordOld: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(this.sessionSrv.token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionSrv.token}`
            });
            return this.http.patch<User>(`${environment.apiUrl}user/${userId}/password`, { 'passwordNew': passwordNew, 'passwordOld': passwordOld }, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
