import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { User } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { jwtDecode } from 'jwt-decode';
import { UserT } from '../../interfaces/templates/user-t';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class UserService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getUser(token: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            
            return this.http.get<User>(`${environment.apiUrl}user/${userId}`, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    getAllUsers(token: string): Observable<User[]> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<User[]>(`${environment.apiUrl}user`, { headers }).pipe(
                catchError(error => this.errorHandle(error, 'Usuario'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    update(userNew: UserT, token: string): Observable<any> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.put<User>(`${environment.apiUrl}user/${userId}`, userNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateName(nameNew: string, token: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.patch<User>(`${environment.apiUrl}user/${userId}/name`, nameNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateEmail(emailNew: string, token: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.patch<User>(`${environment.apiUrl}user/${userId}/email`, emailNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Usuario'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updatePassword(passwordNew: string, passwordOld: string, token: string): Observable<User> {
        try {
            const decodedToken = jwtDecode(token);
            const userId = Number.parseInt(decodedToken.sub || "-1");
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
