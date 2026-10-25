import { Injectable } from '@angular/core';
import { Author } from '../../interfaces/author';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthorService extends ErrorHandlerService {
    private readonly apiUrl = environment.apiUrl + 'autores';

    constructor(private http: HttpClient) {
        super();
    }

    getAllAuthors(): Observable<Author[]> {
        return this.http.get<Author[]>(this.apiUrl);
    }

    getAuthor(authorId: number): Observable<Author> {
        return this.http.get<Author>(`${this.apiUrl}/${authorId}`);
    }

}
