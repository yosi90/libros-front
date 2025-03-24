import { Injectable } from '@angular/core';
import { Author } from '../../interfaces/author';
import { HttpClient } from '@angular/common/http';
import { Observable} from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class AuthorService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'autores';

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    getAllAuthors(): Observable<Author[]> {
        return this.http.get<Author[]>(this.apiUrl);
    }

    addAuthor(author: Author): Observable<Author> {
        return this.http.post<Author>(this.apiUrl, author);
    }

    updateAuthor(author: Author): Observable<Author> {
        return this.http.patch<Author>(this.apiUrl, author);
    }
}
