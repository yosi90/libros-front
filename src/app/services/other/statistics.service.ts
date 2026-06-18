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
    ReadAnthologiesMetric,
    ReadAnthologySectionsMetric,
    ReadBooksMetric,
    UnreadAnthologiesMetric,
    UnreadBooksMetric
} from '../../interfaces/statistics';
import { forkJoin, map, Observable } from 'rxjs';
import { BookService } from '../entities/book.service';
import { Book } from '../../interfaces/book';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient, private bookSrv: BookService) { }

    getGlobalStatistics(): Observable<GlobalStatisticsSnapshot> {
        return forkJoin({
            librosLeidos: this.getReadBooks(),
            librosNoLeidos: this.getUnreadBooks(),
            antologiasLeidas: this.getReadAntologies(),
            antologiasNoLeidas: this.getUnreadAntologies(),
            seccionesAntologiaLeidas: this.getReadAntologySections(),
            libroMasRapido: this.getFastestReadBook(),
            topLibrosMasRapidos: this.getFastestReadBooks(),
            libroMasTiempoSinLeer: this.getBookLongestUnread(),
            librosPorComprar: this.getBooksPendingPurchase(),
            historialLectura: this.getReadingHistory(),
            promedioDiasCompraLectura: this.getAverageReadingTime()
        }).pipe(
            map(results => ({
                LibrosLeidos: results.librosLeidos.libros_leidos,
                LibrosNoLeidos: results.librosNoLeidos.libros_no_leidos,
                AntologiasLeidas: results.antologiasLeidas.antologias_leidas,
                AntologiasNoLeidas: results.antologiasNoLeidas.antologias_no_leidas,
                SeccionesAntologiaLeidas: results.seccionesAntologiaLeidas.secciones_leidas,
                LibroMasRapido: results.libroMasRapido,
                TopLibrosMasRapidos: results.topLibrosMasRapidos,
                LibroMasTiempoSinLeer: results.libroMasTiempoSinLeer,
                LibrosPorComprar: results.librosPorComprar,
                HistorialLectura: results.historialLectura,
                PromedioDiasCompraLectura: results.promedioDiasCompraLectura.promedio_dias
            }))
        );
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
}
