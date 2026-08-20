import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { Universe, UniverseMetricsResponse, UniverseSectionWrite, UniverseWrite } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';
import { CatalogAdminEntity } from '../../interfaces/catalog';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'universos';
    private catalogAdminUrl = environment.apiUrl + 'catalogo/admin/universos';
    private sectionsUrl = environment.apiUrl + 'secciones/universo';

    constructor(private http: HttpClient) {
        super();
    }

    getUniverses(): Observable<Universe[]> {
        return this.http.get<Universe[]>(this.apiUrl);
    }

    getUniverse(universeId: number): Observable<Universe> {
        return this.http.get<Universe>(`${this.apiUrl}/${universeId}`);
    }

    getMetrics(): Observable<UniverseMetricsResponse> {
        return this.http.get<UniverseMetricsResponse>(`${this.apiUrl}/metricas`);
    }

    addUniverse(universe: UniverseWrite): Observable<Universe> {
        return this.http.post<CatalogAdminEntity>(this.catalogAdminUrl, this.toCatalogAdminWrite(universe)).pipe(
            switchMap(created => this.getUniverse(created.Id))
        );
    }

    updateUniverse(universe: UniverseWrite): Observable<Universe> {
        if (!universe.Id)
            throw new Error('El universo necesita id para actualizarse');
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${universe.Id}`, this.toCatalogAdminWrite(universe)).pipe(
            switchMap(updated => this.getUniverse(updated.Id))
        );
    }

    getUniverseSections(universeId: number): Observable<unknown[]> {
        return this.http.get<unknown[]>(`${this.sectionsUrl}/${universeId}`);
    }

    getUniverseSection(universeId: number, bookId: number): Observable<unknown> {
        return this.http.get<unknown>(`${this.sectionsUrl}/${universeId}/${bookId}`);
    }

    addBookToUniverse(section: UniverseSectionWrite): Observable<unknown> {
        return this.http.post<unknown>(this.sectionsUrl, section);
    }

    removeBookFromUniverse(universeId: number, bookId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${this.sectionsUrl}/${universeId}/${bookId}`);
    }

    private toCatalogAdminWrite(universe: UniverseWrite): Record<string, unknown> {
        return {
            Nombre: universe.Nombre,
            Autores: universe.Autores.map(author => author.Id)
        };
    }
}
