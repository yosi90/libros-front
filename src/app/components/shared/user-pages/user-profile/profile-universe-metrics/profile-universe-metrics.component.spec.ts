import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UniverseMetricsResponse, UniverseStateSummary } from '../../../../../interfaces/universe';
import { ProfileUniverseMetricsComponent } from './profile-universe-metrics.component';

describe('ProfileUniverseMetricsComponent', () => {
    let fixture: ComponentFixture<ProfileUniverseMetricsComponent>;
    let component: ProfileUniverseMetricsComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ProfileUniverseMetricsComponent] }).compileComponents();
        fixture = TestBed.createComponent(ProfileUniverseMetricsComponent);
        component = fixture.componentInstance;
    });

    it('keeps loading, error and retry independent from profile content', () => {
        component.loading = false;
        component.loadError = true;
        const retry = jasmine.createSpy('retry');
        component.retry.subscribe(retry);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('No pudimos cargar las métricas');
        (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
        expect(retry).toHaveBeenCalled();
    });

    it('shows a dedicated empty state for a collection without metrics', () => {
        component.loading = false;
        component.metrics = metricsFixture(emptyState(), emptyState(), emptyState());
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Aún no hay métricas');
        expect(fixture.nativeElement.querySelector('.library-insights__summary')).toBeNull();
    });

    it('renders private totals and reading highlights', () => {
        component.loading = false;
        component.metrics = {
            ...metricsFixture(
                { ...emptyState(), Total: 6, Leidos: 2, EnMarcha: 1 },
                { ...emptyState(), Total: 1, EnMarcha: 1 },
                { ...emptyState(), Total: 2 }
            ),
            Resumen: {
                Libros: { ...emptyState(), Total: 6, Leidos: 2, EnMarcha: 1 },
                Antologias: { ...emptyState(), Total: 1, EnMarcha: 1 },
                Secciones: { ...emptyState(), Total: 2 },
                TotalCapitulos: 24,
                TotalCapitulosInterludio: 2,
                TotalPersonajes: 18
            },
            LibroMasRapido: {
                Id: 1,
                Nombre: 'Libro veloz',
                FechaInicio: '2026-08-01T10:00:00Z',
                FechaFin: '2026-08-02T12:00:00Z',
                TiempoLectura: { HorasTotales: 26, Dias: 1, Horas: 2 }
            },
            LibroMasTiempoPendiente: { Id: 2, Nombre: 'Libro pendiente', FechaUltimoEstado: '2025-08-01T00:00:00Z', Dias: 365 },
            PersonajeMasRecurrente: { Id: 3, Nombre: 'Personaje recurrente', Apariciones: 42 }
        };
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('Libro veloz');
        expect(text).toContain('Libro pendiente');
        expect(text).toContain('Personaje recurrente');
        expect(text).toContain('26');
        expect(text).toContain('18');
    });

    function emptyState(): UniverseStateSummary {
        return { Total: 0, Comprados: 0, Leidos: 0, Pendientes: 0, EnMarcha: 0, PorComprar: 0, QuieroLeer: 0, Descartados: 0, SinEstado: 0 };
    }

    function metricsFixture(libros: UniverseStateSummary, antologias: UniverseStateSummary, secciones: UniverseStateSummary): UniverseMetricsResponse {
        return {
            Resumen: { Libros: libros, Antologias: antologias, Secciones: secciones, TotalCapitulos: 0, TotalCapitulosInterludio: 0, TotalPersonajes: 0 },
            ComprasUltimosMeses: [],
            LibroMasRapido: null,
            TopLibrosMasRapidos: [],
            LibroMasTiempoPendiente: null,
            PersonajeMasRecurrente: null,
            PorUniverso: {}
        };
    }
});
