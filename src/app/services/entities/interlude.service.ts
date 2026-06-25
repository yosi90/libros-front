import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { InterludeWrite } from '../../interfaces/api-contract';
import { Interlude } from '../../interfaces/interlude';

@Injectable({
    providedIn: 'root'
})
export class InterludeService {
    private apiUrl = environment.apiUrl + 'interludios';

    constructor(private http: HttpClient) { }

    createForBook(bookId: number, payload: InterludeWrite): Observable<Interlude> {
        return this.http.post<Interlude>(`${this.apiUrl}/libros/${bookId}`, payload);
    }

    update(interludeId: number, payload: InterludeWrite): Observable<Interlude> {
        return this.http.put<Interlude>(`${this.apiUrl}/${interludeId}`, payload);
    }
}
