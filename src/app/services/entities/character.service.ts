import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CharacterT } from '../../interfaces/templates/character-t';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Character } from '../../interfaces/character';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class CharacterService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getCharacter(characterId: number, token: string): Observable<Character> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.get<Character>(`${environment.apiUrl}character/${characterId}`, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Personaje'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    addCharacter(characterNew: CharacterT, bookId: number, token: string): Observable<Character> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            characterNew.bookId = bookId;
            return this.http.post<Character>(`${environment.apiUrl}character`, characterNew, { headers }).pipe(
                tap((response: Character) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Personaje'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateCharacter(characterNew: CharacterT, characterId: number, token: string): Observable<Character> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.put<Character>(`http://localhost:8080/api/v1/character/${characterId}`, characterNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Personaje'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
