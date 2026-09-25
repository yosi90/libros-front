import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import {
    AverageReadingTimeMetric,
    BookStale,
    BookStatisticsSnapshot,
    createBookStatisticsSnapshot,
    FastRead,
    GlobalStatisticsSnapshot,
    IdNameMetric,
    MonthlyCount,
    ReadingStatusDistribution,
    ReadAnthologiesMetric,
    ReadAnthologySectionsMetric,
    ReadBooksMetric,
    UnreadAnthologiesMetric,
    UnreadBooksMetric
} from '../../interfaces/statistics';
import { catchError, defer, forkJoin, map, Observable, of } from 'rxjs';
import { BookService } from '../entities/book.service';
import { Book } from '../../interfaces/book';
import { CollectionService } from '../entities/collection.service';
import { getLatestStatusId, readingStatusOptions } from '../../shared/reading-status';
import { CollectionItem } from '../../interfaces/catalog';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    private baseUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private bookSrv: BookService,
        private collectionSrv: CollectionService
    ) { }

    getGlobalStatistics(): Observable<GlobalStatisticsSnapshot> {
        return defer(() => {
            let failed = 0;
            const tolerant = <T>(source: Observable<T>, fallback: T): Observable<T> => source.pipe(
                catchError(() => {
                    failed++;
                    return of(fallback);
                })
            );
            const requests = {
                librosLeidos: tolerant(this.getReadBooks().pipe(map(metric => metric.libros_leidos)), null),
                librosNoLeidos: tolerant(this.getUnreadBooks().pipe(map(metric => metric.libros_no_leidos)), null),
                antologiasLeidas: tolerant(this.getReadAntologies().pipe(map(metric => metric.antologias_leidas)), null),
                antologiasNoLeidas: tolerant(this.getUnreadAntologies().pipe(map(metric => metric.antologias_no_leidas)), null),
                seccionesAntologiaLeidas: tolerant(this.getReadAntologySections().pipe(map(metric => metric.secciones_leidas)), null),
                libroMasRapido: tolerant(this.getFastestReadBook(), null),
                topLibrosMasRapidos: tolerant(this.getFastestReadBooks(), [] as FastRead[]),
                libroMasTiempoSinLeer: tolerant(this.getBookLongestUnread(), null),
                librosPorComprar: tolerant(this.getBooksPendingPurchase(), [] as IdNameMetric[]),
                historialLectura: tolerant(this.getReadingHistory(), [] as MonthlyCount[]),
                promedioDiasCompraLectura: tolerant(this.getAverageReadingTime().pipe(map(metric => metric.promedio_dias)), null),
                collectionItems: tolerant(this.collectionSrv.getItems(), [] as CollectionItem[])
            };

            return forkJoin(requests).pipe(
                map(results => ({
                    LibrosLeidos: results.librosLeidos,
                    LibrosNoLeidos: results.librosNoLeidos,
                    AntologiasLeidas: results.antologiasLeidas,
                    AntologiasNoLeidas: results.antologiasNoLeidas,
                    SeccionesAntologiaLeidas: results.seccionesAntologiaLeidas,
                    LibroMasRapido: results.libroMasRapido,
                    TopLibrosMasRapidos: results.topLibrosMasRapidos,
                    LibroMasTiempoSinLeer: results.libroMasTiempoSinLeer,
                    LibrosPorComprar: results.librosPorComprar,
                    HistorialLectura: results.historialLectura,
                    PromedioDiasCompraLectura: results.promedioDiasCompraLectura,
                    DistribucionEstados: this.getReadingStatusDistribution(results.collectionItems),
                    MetricasSolicitadas: Object.keys(requests).length,
                    MetricasNoDisponibles: failed
                }))
            );
        });
    }

    getBookStatistics(bookId: number): Observable<BookStatisticsSnapshot> {
        return this.bookSrv.getBook(bookId).pipe(
            map(book => createBookStatisticsSnapshot(book))
        );
    }

    getBookStatisticsFromBook(book: Book): BookStatisticsSnapshot {
        return createBookStatisticsSnapshot(book);
    }

    getReadBooks() {
        return this.http.get<ReadBooksMetric>(`${this.baseUrl}libros/leidos`);
    }

    getUnreadBooks() {
        return this.http.get<UnreadBooksMetric>(`${this.baseUrl}libros/no_leidos`);
    }

    getBookLongestUnread() {
        return this.http.get<BookStale | null>(`${this.baseUrl}libros/sin_leer`);
    }

    getBooksPendingPurchase() {
        return this.http.get<IdNameMetric[]>(`${this.baseUrl}libros/por_comprar`);
    }

    getFastestReadBook() {
        return this.http.get<FastRead | null>(`${this.baseUrl}libros/mas_rapido`);
    }

    getFastestReadBooks() {
        return this.http.get<FastRead[]>(`${this.baseUrl}libros/top_mas_rapido`);
    }

    getReadAntologies() {
        return this.http.get<ReadAnthologiesMetric>(`${this.baseUrl}antologias/leidos`);
    }

    getUnreadAntologies() {
        return this.http.get<UnreadAnthologiesMetric>(`${this.baseUrl}antologias/no_leidos`);
    }

    getReadAntologySections() {
        return this.http.get<ReadAnthologySectionsMetric>(`${this.baseUrl}antologias/secciones/leidas`);
    }

    getReadingHistory() {
        return this.http.get<MonthlyCount[]>(`${this.baseUrl}libros/historial_leidos`);
    }

    getAverageReadingTime() {
        return this.http.get<AverageReadingTimeMetric>(`${this.baseUrl}libros/promedio_compra_lectura`);
    }

    private getReadingStatusDistribution(items: CollectionItem[]): ReadingStatusDistribution[] {
        const totals = new Map(readingStatusOptions.map(status => [status.Id, 0]));

        items.forEach(item => {
            const statusId = getLatestStatusId(item.Estados);
            if (statusId !== null)
                totals.set(statusId, (totals.get(statusId) ?? 0) + 1);
        });

        return readingStatusOptions.map(status => ({
            EstadoId: status.Id,
            Total: totals.get(status.Id) ?? 0
        }));
    }
}
