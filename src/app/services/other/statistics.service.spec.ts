import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { GlobalStatisticsSnapshot } from '../../interfaces/statistics';
import { BookService } from '../entities/book.service';
import { CollectionService } from '../entities/collection.service';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
    let service: StatisticsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: BookService, useValue: {} },
                { provide: CollectionService, useValue: { getItems: () => of([]) } }
            ]
        });
        service = TestBed.inject(StatisticsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('conserva las métricas disponibles cuando falla un endpoint aislado', () => {
        let snapshot: GlobalStatisticsSnapshot | undefined;
        service.getGlobalStatistics().subscribe(result => snapshot = result);

        const flush = (path: string, body: object | null) => http.expectOne(`${environment.apiUrl}${path}`).flush(body);
        flush('libros/leidos', { libros_leidos: 34 });
        flush('libros/no_leidos', { libros_no_leidos: 88 });
        flush('antologias/leidos', { antologias_leidas: 2 });
        flush('antologias/no_leidos', { antologias_no_leidas: 2 });
        http.expectOne(`${environment.apiUrl}antologias/secciones/leidas`).flush(
            { code: 'anthology_sections_read_count_internal_error', success: false },
            { status: 500, statusText: 'Internal Server Error' }
        );
        flush('libros/mas_rapido', null);
        flush('libros/top_mas_rapido', []);
        flush('libros/sin_leer', null);
        flush('libros/por_comprar', [{ Id: 7, Nombre: 'Nimbo' }]);
        flush('libros/historial_leidos', []);
        flush('libros/promedio_compra_lectura', { promedio_dias: 12 });

        expect(snapshot).toBeDefined();
        expect(snapshot!.LibrosLeidos).toBe(34);
        expect(snapshot!.LibrosNoLeidos).toBe(88);
        expect(snapshot!.SeccionesAntologiaLeidas).toBeNull();
        expect(snapshot!.LibrosPorComprar.length).toBe(1);
        expect(snapshot!.PromedioDiasCompraLectura).toBe(12);
        expect(snapshot!.MetricasNoDisponibles).toBe(1);
        expect(snapshot!.MetricasSolicitadas).toBe(12);
    });
});
