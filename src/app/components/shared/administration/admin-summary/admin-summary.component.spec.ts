import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { AdminSummary } from '../../../../interfaces/admin';
import { UserService } from '../../../../services/entities/user.service';
import { AdminSummaryComponent } from './admin-summary.component';

describe('AdminSummaryComponent', () => {
    let fixture: ComponentFixture<AdminSummaryComponent>;
    let users: jasmine.SpyObj<UserService>;
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
        await TestBed.configureTestingModule({ imports: [AdminSummaryComponent], providers: [{ provide: UserService, useValue: users }] }).compileComponents();
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
});
