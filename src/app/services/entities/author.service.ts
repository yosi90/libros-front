import { Injectable } from '@angular/core';
import { Author } from '../../interfaces/author';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';
import { CatalogAdminEntity } from '../../interfaces/catalog';

@Injectable({
    providedIn: 'root'
})
export class AuthorService extends ErrorHandlerService {
    private readonly apiUrl = environment.apiUrl + 'autores';
    private readonly catalogAdminUrl = environment.apiUrl + 'catalogo/admin/autores';

    constructor(private http: HttpClient) {
        super();
    }

    getAllAuthors(): Observable<Author[]> {
        return this.http.get<Author[]>(this.apiUrl);
    }

    getAuthor(authorId: number): Observable<Author> {
        return this.http.get<Author>(`${this.apiUrl}/${authorId}`);
    }

    addAuthor(author: Author): Observable<Author> {
        return this.http.post<CatalogAdminEntity>(this.catalogAdminUrl, this.toCatalogAdminWrite(author)).pipe(
            switchMap(created => this.getAuthor(created.Id))
        );
    }

    updateAuthor(author: Author): Observable<Author> {
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${author.Id}`, this.toCatalogAdminWrite(author)).pipe(
            switchMap(updated => this.getAuthor(updated.Id))
        );
    }

    private toCatalogAdminWrite(author: Author): Record<string, unknown> {
        const languageId = author.IdiomaId ?? (typeof author.Idioma === 'object' ? author.Idioma?.Id : null);
        const originId = author.LugarOrigenId ?? (typeof author.LugarOrigen === 'object' ? author.LugarOrigen?.Id : null);
        const originName = author.LugarOrigenNombre ?? (typeof author.LugarOrigen === 'string' ? author.LugarOrigen : null);
        return {
            Nombre: author.Nombre,
            IdiomaId: languageId ?? null,
            ...(originId ? { LugarOrigenId: originId } : originName?.trim() ? { LugarOrigenNombre: originName.trim() } : {})
        };
    }
}
