import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { BookNote, BookNoteWrite } from '../../interfaces/note';

@Injectable({
    providedIn: 'root'
})
export class NoteService {
    private apiUrl = environment.apiUrl + 'notas';

    constructor(private http: HttpClient) { }

    getByBook(bookId: number): Observable<BookNote[]> {
        return this.http.get<BookNote[]>(`${this.apiUrl}/libro/${bookId}`);
    }

    create(payload: BookNoteWrite): Observable<BookNote> {
        return this.http.post<BookNote>(this.apiUrl, payload);
    }

    update(payload: BookNoteWrite & { Id: number }): Observable<BookNote> {
        return this.http.patch<BookNote>(this.apiUrl, payload);
    }

    delete(noteId: number): Observable<unknown> {
        return this.http.delete(`${this.apiUrl}/${noteId}`);
    }
}
