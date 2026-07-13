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
                        getAdminRoles: () => of([{ Id: 1, Nombre: 'usuario' }, { Id: 3, Nombre: 'administrador' }]),
                        getAdminUsers: () => of({
                            success: true,
                            Usuarios: [
                                { Id: 1, Nombre: 'Lectora', Email: 'lectora@example.com', Rol: { Id: 1, Nombre: 'usuario' }, EstadoCuenta: { Id: 1, Nombre: 'Activa' }, EmailVerificado: true, FechaRegistro: '2026-01-01T00:00:00Z' },
                                { Id: 2, Nombre: 'Admin', Email: 'admin@example.com', Rol: { Id: 3, Nombre: 'administrador' }, EstadoCuenta: { Id: 1, Nombre: 'Activa' }, EmailVerificado: true, FechaRegistro: '2026-01-02T00:00:00Z' }
                            ],
                            SiguienteCursor: null
                        }),
                        getAdminUser: (id: number) => of({
                            success: true,
                            Usuario: { Id: id, Nombre: 'Admin', Email: 'admin@example.com', Rol: { Id: 3, Nombre: 'administrador' }, EstadoCuenta: { Id: 1, Nombre: 'Activa' }, EmailVerificado: true, FechaRegistro: '2026-01-02T00:00:00Z' },
                            Incidentes: [],
                            SiguienteCursorIncidentes: null
                        })
                    }
                },
                { provide: SessionService, useValue: { isAdmin: true, userId: 2 } }
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

    it('abre la ficha administrativa sin permitir autoeditar el rol', () => {
        component.openDetail(component.users[1]);
        fixture.detectChanges();

        expect(component.selectedUser?.Id).toBe(2);
        expect(component.isOwnDetail).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Tu propio rol no puede modificarse');
    });
});
