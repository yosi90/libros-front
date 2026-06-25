import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ChapterWrite, InterludeChapterWrite } from '../../interfaces/api-contract';
import { Chapter } from '../../interfaces/chapter';

@Injectable({
    providedIn: 'root'
})
export class ChapterService {
    private chapterUrl = environment.apiUrl + 'capitulos';
    private interludeChapterUrl = environment.apiUrl + 'capitulos-interludio';

    constructor(private http: HttpClient) { }

    createForBook(bookId: number, payload: ChapterWrite): Observable<Chapter> {
        return this.http.post<Chapter>(`${this.chapterUrl}/libros/${bookId}`, payload);
    }

    update(chapterId: number, payload: ChapterWrite): Observable<Chapter> {
        return this.http.put<Chapter>(`${this.chapterUrl}/${chapterId}`, payload);
    }

    createForInterlude(interludeId: number, payload: InterludeChapterWrite): Observable<Chapter> {
        return this.http.post<Chapter>(`${this.interludeChapterUrl}/interludios/${interludeId}`, payload);
    }

    updateInterludeChapter(chapterId: number, payload: InterludeChapterWrite): Observable<Chapter> {
        return this.http.put<Chapter>(`${this.interludeChapterUrl}/${chapterId}`, payload);
    }
}
