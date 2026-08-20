import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OperationalMetrics } from '../../../../interfaces/community-capabilities';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { ApiHealthService, RealtimeHealth } from '../../../../services/other/api-health.service';
import { OperationalMetricsComponent } from './operational-metrics.component';

describe('OperationalMetricsComponent', () => {
    let fixture: ComponentFixture<OperationalMetricsComponent>;
    let moderation: jasmine.SpyObj<ModerationService>;
    let health: jasmine.SpyObj<ApiHealthService>;

    const metrics = {
        Granularidad: 'hora',
        VentanaHoras: 24,
        RetrasoEsperadoSegundos: 30,
        RetencionDias: {},
        EstadoActual: { MiembrosClubActivos: 8, SancionesActivas: 1, AlegacionesPendientes: 2, VersionConfiguracion: 4 },
        Entregas: [],
        DenegacionesGate: [],
        NoInstrumentado: []
    } satisfies OperationalMetrics;
    const diagnosis: RealtimeHealth = {
        success: true,
        status: 'degraded',
        issues: ['realtime_outbox_dead_letters', 'nats_unreachable'],
        realtimeOutbox: { pending: 14, deadLetters: 2, oldestAgeSeconds: 900, maxAttempts: 8 },
        firestoreOutbox: { pending: 3, deadLetters: 0, oldestAgeSeconds: 120, maxAttempts: 2 },
        natsTcpReachable: false
    };

    beforeEach(async () => {
        moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['getOperationalMetrics']);
        moderation.getOperationalMetrics.and.returnValue(of(metrics));
        health = jasmine.createSpyObj<ApiHealthService>('ApiHealthService', ['getRealtimeHealth']);
        health.getRealtimeHealth.and.returnValue(of(diagnosis));

        await TestBed.configureTestingModule({
            imports: [OperationalMetricsComponent],
            providers: [
                { provide: ModerationService, useValue: moderation },
                { provide: ApiHealthService, useValue: health }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(OperationalMetricsComponent);
    });

    it('shows typed realtime counters and human-readable issues', () => {
        fixture.detectChanges();

        const panel: HTMLElement = fixture.nativeElement.querySelector('[data-testid="realtime-health"]');
        expect(panel.textContent).toContain('Con incidencias');
        expect(panel.textContent).toContain('14 pendientes');
        expect(panel.textContent).toContain('2 errores');
        expect(panel.textContent).toContain('NATS no es accesible desde la API.');
        expect(panel.textContent).not.toContain('realtime_outbox_dead_letters');
    });

    it('keeps delivery metrics visible when only realtime diagnosis fails', () => {
        health.getRealtimeHealth.and.returnValue(throwError(() => new Error('unavailable')));
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('No se ha podido cargar el diagnóstico realtime.');
        expect(fixture.nativeElement.textContent).toContain('8');
        expect(fixture.nativeElement.textContent).toContain('Miembros activos');
    });

    it('reloads both datasets from the main refresh action', () => {
        fixture.detectChanges();
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('.operational-metrics__header > button');
        button.click();

        expect(moderation.getOperationalMetrics).toHaveBeenCalledTimes(2);
        expect(health.getRealtimeHealth).toHaveBeenCalledTimes(2);
    });
});
