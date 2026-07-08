import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    CollectionItem,
    CollectionUniverse,
    CollectionWriteResponse,
    RatingUpdateResponse,
    RatingWrite,
    ReviewUpdateResponse,
    ReviewWrite,
    ReadingStatusUpdateResponse,
    ReadingStatusWrite
} from '../../interfaces/catalog';
import { Universe } from '../../interfaces/universe';
import { Antology } from '../../interfaces/antology';
import { BookSimple } from '../../interfaces/book';
import { Saga } from '../../interfaces/saga';
import { toReadStatus } from '../../shared/reading-status';

@Injectable({ providedIn: 'root' })
export class CollectionService {
    private readonly apiUrl = environment.apiUrl + 'coleccion';

    constructor(private http: HttpClient) { }

    getItems(tipo?: 'libro' | 'antologia'): Observable<CollectionItem[]> {
        const params = tipo ? new HttpParams().set('tipo', tipo) : undefined;
        return this.http.get<CollectionItem[]>(`${this.apiUrl}/items`, { params });
    }

    getUniverses(): Observable<Universe[]> {
        return this.http.get<CollectionUniverse[]>(`${this.apiUrl}/universos`)
            .pipe(map(universes => universes.map(universe => this.toUniverse(universe))));
    }

    updateBookStatus(bookId: number, payload: ReadingStatusWrite): Observable<ReadingStatusUpdateResponse> {
        return this.http.post<ReadingStatusUpdateResponse>(`${this.apiUrl}/libros/${bookId}/estado`, payload);
    }

    updateBookRating(bookId: number, payload: RatingWrite): Observable<RatingUpdateResponse> {
        return this.http.patch<RatingUpdateResponse>(`${this.apiUrl}/libros/${bookId}/puntuacion`, payload);
    }

    updateBookReview(bookId: number, payload: ReviewWrite): Observable<ReviewUpdateResponse> {
        return this.http.patch<ReviewUpdateResponse>(`${this.apiUrl}/libros/${bookId}/resena`, payload);
    }

    updateBookStatusHistory(statusHistoryId: number, payload: ReadingStatusWrite): Observable<ReadingStatusUpdateResponse> {
        return this.http.patch<ReadingStatusUpdateResponse>(`${this.apiUrl}/libros/estados/${statusHistoryId}`, payload);
    }

    deleteBookStatusHistory(statusHistoryId: number): Observable<CollectionWriteResponse> {
        return this.http.delete<CollectionWriteResponse>(`${this.apiUrl}/libros/estados/${statusHistoryId}`);
    }

    updateAnthologyStatus(anthologyId: number, payload: ReadingStatusWrite): Observable<ReadingStatusUpdateResponse> {
        return this.http.post<ReadingStatusUpdateResponse>(`${this.apiUrl}/antologias/${anthologyId}/estado`, payload);
    }

    updateAnthologyRating(anthologyId: number, payload: RatingWrite): Observable<RatingUpdateResponse> {
        return this.http.patch<RatingUpdateResponse>(`${this.apiUrl}/antologias/${anthologyId}/puntuacion`, payload);
    }

    updateAnthologyReview(anthologyId: number, payload: ReviewWrite): Observable<ReviewUpdateResponse> {
        return this.http.patch<ReviewUpdateResponse>(`${this.apiUrl}/antologias/${anthologyId}/resena`, payload);
    }

    updateAnthologyStatusHistory(statusHistoryId: number, payload: ReadingStatusWrite): Observable<ReadingStatusUpdateResponse> {
        return this.http.patch<ReadingStatusUpdateResponse>(`${this.apiUrl}/antologias/estados/${statusHistoryId}`, payload);
    }

    deleteAnthologyStatusHistory(statusHistoryId: number): Observable<CollectionWriteResponse> {
        return this.http.delete<CollectionWriteResponse>(`${this.apiUrl}/antologias/estados/${statusHistoryId}`);
    }

    private toUniverse(universe: CollectionUniverse): Universe {
        return {
            Id: universe.Id,
            Nombre: universe.Nombre,
            Autores: universe.Autores ?? [],
            Libros: (universe.Libros ?? []).filter(item => item.Tipo !== 'antologia').map(item => this.toBook(item)),
            Antologias: (universe.Antologias ?? []).map(item => this.toAntology(item)),
            Sagas: (universe.Sagas ?? []).map(saga => this.toSaga(saga))
        };
    }

    private toSaga(saga: NonNullable<CollectionUniverse['Sagas']>[number]): Saga {
        return {
            ...saga,
            Autores: saga.Autores ?? [],
            Libros: (saga.Libros ?? []).filter(item => item.Tipo !== 'antologia').map(item => this.toBook(item)),
            Antologias: (saga.Antologias ?? []).map(item => this.toAntology(item))
        };
    }

    private toBook(item: CollectionItem): BookSimple {
        return {
            Tipo: 'libro',
            Id: item.Id,
            Nombre: item.Nombre,
            Autores: item.Autores ?? [],
            Estados: (item.Estados ?? []).map(status => toReadStatus(status)),
            Orden: item.Orden ?? -1,
            Portada: item.Portada ?? '',
            ISBN: item.ISBN,
            FechaPublicacion: item.FechaPublicacion,
            IdiomasDisponibles: item.IdiomasDisponibles,
            Estilos: item.Estilos,
            Estilo: item.Estilo,
            Puntuacion: item.Puntuacion,
            Resena: item.Resena,
            ResenaOculta: item.ResenaOculta,
            PorcentajeCompletado: item.PorcentajeCompletado,
            FechaAgregado: item.FechaAgregado,
            FechaActualizacion: item.FechaActualizacion,
            PuedeAbrirNarrativa: item.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: item.NarrativaPersonalDisponible
        };
    }

    private toAntology(item: CollectionItem): Antology {
        return {
            Tipo: 'antologia',
            Id: item.Id,
            Nombre: item.Nombre,
            Autores: item.Autores ?? [],
            Estados: (item.Estados ?? []).map(status => toReadStatus(status)),
            Orden: item.Orden ?? -1,
            Portada: item.Portada ?? '',
            ISBN: item.ISBN,
            FechaPublicacion: item.FechaPublicacion,
            IdiomasDisponibles: item.IdiomasDisponibles,
            Estilos: item.Estilos,
            Estilo: item.Estilo,
            Puntuacion: item.Puntuacion,
            Resena: item.Resena,
            ResenaOculta: item.ResenaOculta,
            FechaAgregado: item.FechaAgregado,
            FechaActualizacion: item.FechaActualizacion,
            PuedeAbrirNarrativa: item.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: item.NarrativaPersonalDisponible
        };
    }
}
