import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { Author } from '../../interfaces/author';
import { CatalogItem, CatalogOption, CatalogPublicDetail, CatalogQuery, OriginPlacesPage } from '../../interfaces/catalog';
import { Saga } from '../../interfaces/saga';
import { Universe } from '../../interfaces/universe';

@Injectable({ providedIn: 'root' })
export class CatalogService {
    private readonly apiUrl = environment.apiUrl + 'catalogo';

    constructor(private http: HttpClient) { }

    getBooks(query: CatalogQuery = {}): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/libros`, { params: this.toParams(query) });
    }

    getAnthologies(query: CatalogQuery = {}): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/antologias`, { params: this.toParams(query) });
    }

    getBookPublicDetail(bookId: number): Observable<CatalogPublicDetail> {
        return this.http.get<CatalogPublicDetail>(`${this.apiUrl}/libros/${bookId}/detalle-publico`);
    }

    getAnthologyPublicDetail(anthologyId: number): Observable<CatalogPublicDetail> {
        return this.http.get<CatalogPublicDetail>(`${this.apiUrl}/antologias/${anthologyId}/detalle-publico`);
    }

    getAuthors(q = ''): Observable<Author[]> {
        return this.http.get<Author[]>(`${this.apiUrl}/autores`, { params: this.toParams({ q }) });
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
