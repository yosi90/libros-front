import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GlobalStatisticsSnapshot } from '../../../../interfaces/statistics';
import { StatisticsService } from '../../../../services/other/statistics.service';
import { StatisticsComponent } from './statistics.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';

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
        DistribucionEstados: [{ EstadoId: 3, Total: 2 }]
    };

    beforeEach(async () => {
        statistics = jasmine.createSpyObj<StatisticsService>('StatisticsService', ['getGlobalStatistics']);
        statistics.getGlobalStatistics.and.returnValue(of(snapshot));
        await TestBed.configureTestingModule({ imports: [StatisticsComponent], providers: [
            { provide: StatisticsService, useValue: statistics },
            { provide: PresentationModeService, useValue: { snapshot: { isMobilePresentationActive: false } } }
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
});
