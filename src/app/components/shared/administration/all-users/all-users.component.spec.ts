import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AllUsersComponent } from './all-users.component';
import { UserService } from '../../../../services/entities/user.service';
import { SessionService } from '../../../../services/auth/session.service';

describe('AllUsersComponent', () => {
    let component: AllUsersComponent;
    let fixture: ComponentFixture<AllUsersComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AllUsersComponent],
            providers: [
                {
                    provide: UserService,
                    useValue: {
                        getAdminUsers: () => of({
                            success: true,
                            Usuarios: [
                                { Id: 1, Nombre: 'Lectora', Email: 'lectora@example.com', Rol: { Id: 1, Nombre: 'usuario' }, EstadoCuenta: { Id: 1, Nombre: 'Activa' }, EmailVerificado: true, FechaRegistro: '2026-01-01T00:00:00Z' },
                                { Id: 2, Nombre: 'Admin', Email: 'admin@example.com', Rol: { Id: 3, Nombre: 'administrador' }, EstadoCuenta: { Id: 1, Nombre: 'Activa' }, EmailVerificado: true, FechaRegistro: '2026-01-02T00:00:00Z' }
                            ],
                            SiguienteCursor: null
                        })
                    }
                },
                { provide: SessionService, useValue: { isAdmin: true } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AllUsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('muestra al administrador recibido por la ruta administrativa', () => {
        expect(fixture.nativeElement.textContent).toContain('Admin');
        expect(component.users.length).toBe(2);
    });
});
