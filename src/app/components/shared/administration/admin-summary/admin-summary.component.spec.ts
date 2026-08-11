import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { AdminSummary } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { ApiHealthService } from '../../../../services/other/api-health.service';
import { AdminSummaryComponent } from './admin-summary.component';

describe('AdminSummaryComponent', () => {
    let fixture: ComponentFixture<AdminSummaryComponent>;
    let users: jasmine.SpyObj<UserService>;
    let health: jasmine.SpyObj<ApiHealthService>;
    const summary: AdminSummary = {
        Cuentas: {
            PorEstado: [{ Id: 1, Nombre: 'Activa', Total: 3 }],
            PorRol: [{ Id: 1, Nombre: 'Administrador', Total: 1 }, { Id: 2, Nombre: 'Usuario', Total: 2 }],
            EmailPendienteVerificacion: 1
        },
        Colas: { PeticionesCatalogo: 2, ReportesResenas: 1, DenunciasComunidad: 1, Alegaciones: 0 },
        Moderacion: { SancionesActivas: 1 },
        Operacion: { RealtimeDeadLetters: 0, FirestoreDeadLetters: 0 }
    };

    beforeEach(async () => {
        users = jasmine.createSpyObj<UserService>('UserService', ['getAdminSummary']);
        users.getAdminSummary.and.returnValue(of(summary));
        health = jasmine.createSpyObj<ApiHealthService>('ApiHealthService', ['check']);
        health.check.and.returnValue(of({
            state: 'online', label: 'API operativa', detail: 'Todo correcto', apiAvailable: true, realtimeAvailable: true,
            components: {
                api: { state: 'healthy', source: 'http', latencyMs: 4, heartbeatAgeSeconds: null },
                sqlServer: { state: 'healthy', source: 'sql', latencyMs: 7, heartbeatAgeSeconds: null },
                realtimeGateway: { state: 'healthy', source: 'heartbeat', latencyMs: null, heartbeatAgeSeconds: 2 }
            }
        }));
        await TestBed.configureTestingModule({ imports: [AdminSummaryComponent], providers: [{ provide: UserService, useValue: users }, { provide: ApiHealthService, useValue: health }] }).compileComponents();
        fixture = TestBed.createComponent(AdminSummaryComponent);
    });

    it('carga una sola vez y conserva datasets y leyendas entre detecciones', () => {
        fixture.detectChanges();
        const states = fixture.componentInstance.accountStateSlices;
        const roles = fixture.componentInstance.accountRoleSlices;
        const legends = Array.from(fixture.nativeElement.querySelectorAll('.admin-summary__legend span, .admin-summary__legend button'));
        fixture.detectChanges();
        const nextLegends = Array.from(fixture.nativeElement.querySelectorAll('.admin-summary__legend span, .admin-summary__legend button'));

        expect(users.getAdminSummary).toHaveBeenCalledTimes(1);
        expect(health.check).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.accountStateSlices).toBe(states);
        expect(fixture.componentInstance.accountRoleSlices).toBe(roles);
        expect(nextLegends).toEqual(legends);
    });

    it('ignora recargas concurrentes', () => {
        users.getAdminSummary.and.returnValue(new Observable<AdminSummary>());
        fixture.componentInstance.load();
        fixture.componentInstance.load();

        expect(users.getAdminSummary).toHaveBeenCalledTimes(1);
    });

    it('muestra el estado general y los tres componentes operativos', () => {
        fixture.detectChanges();

        const healthPanel = fixture.nativeElement.querySelector('[data-testid="admin-health"]');
        expect(healthPanel.getAttribute('data-state')).toBe('online');
        expect(healthPanel.textContent).toContain('API operativa');
        expect(healthPanel.textContent).toContain('SQL Server');
        expect(healthPanel.textContent).toContain('Realtime');
        expect(healthPanel.textContent).toContain('4 ms');
        expect(healthPanel.textContent).toContain('Heartbeat hace 2 s');
    });

    it('mantiene la salud visible si falla solo el resumen', () => {
        users.getAdminSummary.and.returnValue(throwError(() => new Error('summary unavailable')));
        fixture.detectChanges();

        expect(fixture.componentInstance.hasError).toBeTrue();
        expect(fixture.nativeElement.querySelector('[data-testid="admin-health"]')).not.toBeNull();
        expect(fixture.nativeElement.textContent).toContain('No se pudo cargar el resumen administrativo.');
    });

    it('actualiza el resumen y la salud desde el mismo boton', () => {
        fixture.detectChanges();
        const button: HTMLButtonElement = fixture.nativeElement.querySelector('.admin-summary__header button');
        button.click();

        expect(users.getAdminSummary).toHaveBeenCalledTimes(2);
        expect(health.check).toHaveBeenCalledTimes(2);
    });
});
