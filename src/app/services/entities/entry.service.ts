import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NarrativeEntry, NarrativeEntryCreate } from '../../interfaces/api-contract';

export type NarrativeEntityKind = 'personajes' | 'localizaciones' | 'organizaciones' | 'conceptos' | 'eventos' | 'citas';

@Injectable({
    providedIn: 'root'
})
export class EntryService {
    private apiUrl = environment.apiUrl + 'entradas';

    constructor(private http: HttpClient) { }

    list(entity: NarrativeEntityKind, entityId: number, bookId?: number): Observable<NarrativeEntry[]> {
        const query = bookId ? `?libroId=${bookId}` : '';
        return this.http.get<NarrativeEntry[]>(`${this.apiUrl}/${entity}/${entityId}${query}`);
    }

    create(entity: NarrativeEntityKind, entityId: number, bookId: number, entries: NarrativeEntryCreate[]): Observable<NarrativeEntry[]> {
        return this.http.post<NarrativeEntry[]>(`${this.apiUrl}/${entity}/${entityId}`, { LibroId: bookId, Entradas: entries });
    }

    update(entryId: number, payload: NarrativeEntryCreate): Observable<NarrativeEntry> {
        return this.http.put<NarrativeEntry>(`${this.apiUrl}/${entryId}`, payload);
    }

    delete(entryId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${this.apiUrl}/${entryId}`);
    }
}
