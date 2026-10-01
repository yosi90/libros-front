import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { EditionSaved, EditionWrite } from '../../interfaces/catalog';
import { CoverCacheService } from '../cover-cache.service';
import { writeCatalogAdmin } from './catalog-admin-write';

@Injectable({ providedIn: 'root' })
export class CatalogEditionAdminService {
    private readonly apiUrl = environment.apiUrl + 'catalogo/admin';

    constructor(private http: HttpClient, private coverCache: CoverCacheService) { }

    addBookEdition(bookId: number, payload: EditionWrite, imageFile?: File | null): Observable<EditionSaved> {
        return writeCatalogAdmin<EditionSaved>(this.http, this.coverCache, 'post',
            `${this.apiUrl}/libros/${bookId}/ediciones`, payload, imageFile);
    }

    addAnthologyEdition(anthologyId: number, payload: EditionWrite, imageFile?: File | null): Observable<EditionSaved> {
        return writeCatalogAdmin<EditionSaved>(this.http, this.coverCache, 'post',
            `${this.apiUrl}/antologias/${anthologyId}/ediciones`, payload, imageFile);
    }

    updateEdition(editionId: number, payload: EditionWrite, imageFile?: File | null): Observable<EditionSaved> {
        return writeCatalogAdmin<EditionSaved>(this.http, this.coverCache, 'patch',
            `${this.apiUrl}/ediciones/${editionId}`, payload, imageFile);
    }
}
