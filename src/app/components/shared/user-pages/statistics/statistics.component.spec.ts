import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GlobalStatisticsSnapshot } from '../../../../interfaces/statistics';
import { StatisticsService } from '../../../../services/other/statistics.service';
import { StatisticsComponent } from './statistics.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { CatalogService } from '../../../../services/entities/catalog.service';

describe('StatisticsComponent', () => {
    let fixture: ComponentFixture<StatisticsComponent>;
    let statistics: jasmine.SpyObj<StatisticsService>;
    const snapshot: GlobalStatisticsSnapshot = {
        LibrosLeidos: 2,
        LibrosNoLeidos: 1,
        AntologiasLeidas: 0,
        AntologiasNoLeidas: 0,
        SeccionesAntologiaLeidas: 0,
        LibroMasRapido: { Id: 1, Nombre: 'Libro', TiempoLectura: { Dias: 2, Horas: 0 }, FechaInicio: '2026-01-01', FechaLeido: '2026-01-03' },
        TopLibrosMasRapidos: [{ Id: 1, Nombre: 'Libro', TiempoLectura: { Dias: 2, Horas: 0 }, FechaInicio: '2026-01-01', FechaLeido: '2026-01-03' }],
        LibroMasTiempoSinLeer: null,
        LibrosPorComprar: [],
        HistorialLectura: [{ anio: 2026, mes: 1, cantidad: 2 }],
        PromedioDiasCompraLectura: 3,
        DistribucionEstados: [{ EstadoId: 3, Total: 2 }],
        Coleccion: [
            { Tipo: 'libro', Id: 1, Nombre: 'Siega', Portada: null, Autores: [{ Id: 1, Nombre: 'Neal Shusterman' }], Estilos: [{ Id: 1, Nombre: 'Distopía' }], Puntuacion: 5,
                Estados: [{ Id: 1, EstadoId: 2, Fecha: '2026-01-03' }] },
            { Tipo: 'libro', Id: 2, Nombre: 'Nube', Portada: null, Autores: [], Estados: [{ Id: 2, EstadoId: 0, Fecha: '2025-01-01' }] }
        ],
        MetricasSolicitadas: 12,
        MetricasNoDisponibles: 0
    };

    beforeEach(async () => {
        statistics = jasmine.createSpyObj<StatisticsService>('StatisticsService', ['getGlobalStatistics']);
        statistics.getGlobalStatistics.and.returnValue(of(snapshot));
        await TestBed.configureTestingModule({ imports: [StatisticsComponent], providers: [
            { provide: StatisticsService, useValue: statistics },
            { provide: PresentationModeService, useValue: { snapshot: { isMobilePresentationActive: false } } },
            { provide: CatalogService, useValue: { getBooks: () => of([
                { Tipo: 'libro', Id: 1, Nombre: 'Siega', Portada: null, Autores: [{ Id: 1, Nombre: 'Neal Shusterman' }], Estados: [], Estilos: [{ Id: 1, Nombre: 'Distopía' }], FechaPublicacion: '2016-11-22', IdiomasDisponibles: [{ Id: 1, Nombre: 'Español' }] },
                { Tipo: 'libro', Id: 2, Nombre: 'Trueno', Portada: null, Autores: [{ Id: 1, Nombre: 'Neal Shusterman' }], Estados: [], Estilos: [{ Id: 1, Nombre: 'Distopía' }], FechaPublicacion: '2018-01-09' }
            ]) } }
        ] }).compileComponents();
        fixture = TestBed.createComponent(StatisticsComponent);
    });

    it('materializa los tres gráficos cuando existen series útiles', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const renderDeadline = performance.now() + 2000;
        while (fixture.nativeElement.querySelectorAll('.apexcharts-canvas').length < 3 && performance.now() < renderDeadline) {
            await new Promise(resolve => setTimeout(resolve, 25));
            fixture.detectChanges();
        }

        expect(fixture.componentInstance.chartsReady).toBeTrue();
        expect(fixture.componentInstance.chartLibraryAvailable).toBeTrue();
        expect(fixture.nativeElement.querySelectorAll('apx-chart').length).toBe(3);
        expect(fixture.nativeElement.querySelectorAll('.apexcharts-canvas').length).toBe(3);
    });

    it('avisa de métricas parciales sin ocultar las disponibles', async () => {
        statistics.getGlobalStatistics.and.returnValue(of({
            ...snapshot,
            SeccionesAntologiaLeidas: null,
            MetricasNoDisponibles: 1
        }));
        fixture.detectChanges();
        const renderDeadline = performance.now() + 2000;
        while (!fixture.componentInstance.chartsReady && performance.now() < renderDeadline) {
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        fixture.detectChanges();

        const element: HTMLElement = fixture.nativeElement;
        expect(element.querySelector('.statistics-error')?.textContent).toContain('Algunas estadísticas no están disponibles');
        const values = [...element.querySelectorAll('.metric-tile strong')].map(value => value.textContent?.trim());
        expect(values).toContain('2');
        expect(values).toContain('Sin dato');
    });

    it('reparte lo personal y carga lo general del catálogo al abrir su pestaña', () => {
        fixture.detectChanges();
        const component = fixture.componentInstance;
        expect(component.readAuthors).toEqual([{ label: 'Neal Shusterman', value: 1 }]);
        expect(component.stylesRead).toEqual([{ label: 'Distopía', value: 1 }]);
        expect(component.waitingBooks.map(row => row.label)).toEqual(['Nube']);
        expect(component.ratings[4]).toEqual({ label: '5 ★', value: 1 });

        expect(component.generalLoaded).toBeFalse();
        component.setTab('general');
        expect(component.catalogTitles).toBe(2);
        expect(component.catalogAuthors).toEqual([{ label: 'Neal Shusterman', value: 2 }]);
        expect(component.catalogDecades.map(row => row.label)).toEqual(['2010s']);
        expect(component.catalogLanguages).toEqual([{ label: 'Español', value: 1 }]);
    });
});
