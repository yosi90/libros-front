import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    CharacterAliasUpdate,
    CharacterBookAliasWrite,
    CharacterCreate,
    CharacterRelationUpdate,
    CharacterRelationWrite,
    CharacterStateUpdate,
    CharacterStateWrite
} from '../../interfaces/api-contract';
import { Character, CharacterAlias, CharacterRelation, CharacterStatus } from '../../interfaces/character';

@Injectable({
    providedIn: 'root'
})
export class CharacterService {
    private apiUrl = environment.apiUrl + 'personajes';

    constructor(private http: HttpClient) { }

    create(payload: CharacterCreate): Observable<Character> {
        return this.http.post<Character>(this.apiUrl, payload);
    }

    get(characterId: number, bookId?: number): Observable<Character> {
        const query = bookId ? `?libroId=${bookId}` : '';
        return this.http.get<Character>(`${this.apiUrl}/${characterId}${query}`);
    }

    getAliases(characterId: number, includeDeleted = false): Observable<CharacterAlias[]> {
        return this.http.get<CharacterAlias[]>(`${this.apiUrl}/${characterId}/apodos?includeDeleted=${includeDeleted}`);
    }

    createAlias(characterId: number, payload: CharacterBookAliasWrite): Observable<CharacterAlias> {
        return this.http.post<CharacterAlias>(`${this.apiUrl}/${characterId}/apodos`, payload);
    }

    updateAlias(characterId: number, aliasId: number, payload: CharacterAliasUpdate): Observable<CharacterAlias> {
        return this.http.put<CharacterAlias>(`${this.apiUrl}/${characterId}/apodos/${aliasId}`, payload);
    }

    deleteAlias(characterId: number, aliasId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${this.apiUrl}/${characterId}/apodos/${aliasId}`);
    }

    getStates(characterId: number, bookId?: number): Observable<CharacterStatus[]> {
        const query = bookId ? `?libroId=${bookId}` : '';
        return this.http.get<CharacterStatus[]>(`${this.apiUrl}/${characterId}/estados${query}`);
    }

    createState(characterId: number, payload: CharacterStateWrite): Observable<CharacterStatus> {
        return this.http.post<CharacterStatus>(`${this.apiUrl}/${characterId}/estados`, payload);
    }

    updateBookState(characterId: number, bookId: number, payload: CharacterStateUpdate): Observable<CharacterStatus> {
        return this.http.put<CharacterStatus>(`${this.apiUrl}/${characterId}/estados/libros/${bookId}`, payload);
    }

    getRelations(characterId: number, bookId?: number, includeDeleted = false): Observable<CharacterRelation[]> {
        const params = new URLSearchParams();
        params.set('includeDeleted', `${includeDeleted}`);
        if (bookId) params.set('libroId', `${bookId}`);
        return this.http.get<CharacterRelation[]>(`${this.apiUrl}/${characterId}/relaciones?${params.toString()}`);
    }

    createRelation(characterId: number, payload: CharacterRelationWrite): Observable<CharacterRelation> {
        return this.http.post<CharacterRelation>(`${this.apiUrl}/${characterId}/relaciones`, payload);
    }

    updateRelation(characterId: number, relationId: number, payload: CharacterRelationUpdate): Observable<CharacterRelation> {
        return this.http.put<CharacterRelation>(`${this.apiUrl}/${characterId}/relaciones/${relationId}`, payload);
    }

    deleteRelation(characterId: number, relationId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${this.apiUrl}/${characterId}/relaciones/${relationId}`);
    }

    addToBook(characterId: number, payload: CharacterBookAliasWrite): Observable<Character> {
        return this.http.post<Character>(`${this.apiUrl}/${characterId}/libros`, payload);
    }

    changeNarrativeAlias(characterId: number, bookId: number, payload: CharacterAliasUpdate): Observable<Character> {
        return this.http.patch<Character>(`${this.apiUrl}/${characterId}/libros/${bookId}/apodo`, payload);
    }

    correctAlias(characterId: number, bookId: number, payload: CharacterAliasUpdate): Observable<Character> {
        return this.http.put<Character>(`${this.apiUrl}/${characterId}/libros/${bookId}/apodo`, payload);
    }
}
