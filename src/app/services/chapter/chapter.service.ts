import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { ChapterT } from '../../interfaces/templates/chapter-t';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Chapter } from '../../interfaces/chapter';

@Injectable({
    providedIn: 'root'
})
export class ChapterService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    addChapter(chapterNew: ChapterT, token: string): Observable<Chapter> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            console.log(chapterNew);
            return this.http.post<Chapter>('http://localhost:8080/api/v1/chapter', chapterNew, { headers }).pipe(
                tap((response: Chapter) => {
                    return response;
                }),
                catchError(error => this.errorHandle(error, 'Personaje'))
            );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }

    updateChapter(chapterNew: ChapterT, chapterId: number, token: string): Observable<Chapter> {
        try {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
            return this.http.put<Chapter>(`http://localhost:8080/api/v1/chapter/${chapterId}`, chapterNew, { headers })
                .pipe(
                    catchError(error => this.errorHandle(error, 'Personaje'))
                );
        } catch {
            return throwError('Error al decodificar el token JWT.');
        }
    }
}
