import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { Author } from '../../interfaces/author';
import { CatalogAnthologyPublicDetail, CatalogAuthorsPage, CatalogItem, CatalogItemsPage, CatalogOption, CatalogPagedQuery, CatalogPublicDetail, CatalogQuery, GoogleBooksIsbnMetadata, OriginPlacesPage } from '../../interfaces/catalog';
import { Saga } from '../../interfaces/saga';
import { Universe } from '../../interfaces/universe';

@Injectable({ providedIn: 'root' })
export class CatalogService {
    private readonly apiUrl = environment.apiUrl + 'catalogo';

    constructor(private http: HttpClient) { }

    getBooks(query: CatalogQuery = {}): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/libros`, { params: this.toParams(query) });
    }

    getBooksPage(query: CatalogPagedQuery): Observable<CatalogItemsPage> {
        return this.http.get<CatalogItemsPage>(`${this.apiUrl}/libros`, { params: this.toParams(query) });
    }

    getAnthologies(query: CatalogQuery = {}): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/antologias`, { params: this.toParams(query) });
    }

    getBookPublicDetail(bookId: number): Observable<CatalogPublicDetail> {
        return this.http.get<CatalogPublicDetail>(`${this.apiUrl}/libros/${bookId}/detalle-publico`);
    }

    getAnthologyPublicDetail(anthologyId: number): Observable<CatalogAnthologyPublicDetail> {
        return this.http.get<CatalogAnthologyPublicDetail>(`${this.apiUrl}/antologias/${anthologyId}/detalle-publico`);
    }

    getGoogleBooksByIsbn(isbn: string): Observable<GoogleBooksIsbnMetadata> {
        return this.http.get<GoogleBooksIsbnMetadata>(`${this.apiUrl}/google-books/isbn/${encodeURIComponent(isbn)}`);
    }

    getAuthors(q = ''): Observable<Author[]> {
        return this.http.get<Author[]>(`${this.apiUrl}/autores`, { params: this.toParams({ q }) });
    }

    getAuthorsPage(query: { q?: string; page?: number; pageSize?: number }): Observable<CatalogAuthorsPage> {
        return this.http.get<CatalogAuthorsPage>(`${this.apiUrl}/autores`, { params: this.toParams(query) });
    }

    /** Todos los autores canónicos, recorriendo las páginas del listado. */
    getAllAuthors(): Observable<Author[]> {
        const pageSize = 100;
        return this.getAuthorsPage({ page: 1, pageSize }).pipe(
            switchMap(firstPage => {
                const totalPages = Math.ceil(firstPage.Total / firstPage.PageSize);
                if (totalPages <= 1)
                    return of(firstPage.Items);
                const requests = Array.from({ length: totalPages - 1 }, (_, index) => this.getAuthorsPage({ page: index + 2, pageSize }));
                return forkJoin(requests).pipe(map(pages => [...firstPage.Items, ...pages.flatMap(page => page.Items)]));
            })
        );
    }

    getLanguages(): Observable<CatalogOption[]> {
        return this.http.get<CatalogOption[]>(`${this.apiUrl}/idiomas`);
    }

    getOriginPlaces(q = '', page = 1, pageSize = 20): Observable<OriginPlacesPage> {
        return this.http.get<OriginPlacesPage>(`${this.apiUrl}/lugares-origen`, {
            params: this.toParams({ q, page, pageSize })
        });
    }

    getStyles(): Observable<CatalogOption[]> {
        return this.http.get<CatalogOption[]>(`${this.apiUrl}/estilos`);
    }

    getSagas(q = ''): Observable<Saga[]> {
        return this.http.get<Saga[]>(`${this.apiUrl}/sagas`, { params: this.toParams({ q }) });
    }

    getUniverses(q = ''): Observable<Universe[]> {
        return this.http.get<Universe[]>(`${this.apiUrl}/universos`, { params: this.toParams({ q }) });
    }

    private toParams(query: CatalogQuery & { q?: string, page?: number, pageSize?: number }): HttpParams {
        let params = new HttpParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '')
                params = params.set(key, String(value));
        });
        return params;
    }
}
