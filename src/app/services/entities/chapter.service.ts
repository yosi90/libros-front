import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { ChapterT } from '../../interfaces/askers/chapter-t';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Chapter } from '../../interfaces/chapter';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class ChapterService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    addChapter(chapterNew: ChapterT): Observable<Chapter> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.post<Chapter>(`${environment.apiUrl}chapter`, chapterNew, { headers }).pipe(
                tap((response: Chapter) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Personaje'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateChapter(chapterNew: ChapterT, chapterId: number): Observable<Chapter> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
            return this.http.put<Chapter>(`${environment.apiUrl}chapter/${chapterId}`, chapterNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Personaje'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
