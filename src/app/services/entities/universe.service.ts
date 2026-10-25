import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Universe, UniverseMetricsResponse, UniverseSectionWrite } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'universos';
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

}
