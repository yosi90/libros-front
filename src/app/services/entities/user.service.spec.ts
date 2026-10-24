import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PlatformSessionService } from '../auth/platform-session.service';
import { UserService } from './user.service';
import { environment } from '../../../environment/environment';

describe('UserService administration', () => {
    let service: UserService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                UserService,
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: PlatformSessionService, useValue: { isAdmin: true, canModerateCatalog: true, userRole: { Nombre: 'administrador' } } }
            ]
        });
        service = TestBed.inject(UserService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('consulta el usuario local de Libros de la cuenta de Yosiftware', () => {
        service.getOwnProfile().subscribe(profile => {
            expect(profile.Id).toBe(7);
            expect(profile.Nombre).toBe('lectora');
            expect(profile.Role.Nombre).toBe('usuario');
        });

        const request = http.expectOne(`${environment.apiUrl}usuarios/me`);
        expect(request.request.method).toBe('GET');
        request.flush({ success: true, user: { Id: 7, Nombre: 'lectora', Role: { Id: 1, Nombre: 'usuario' } } });
    });

    it('pagina el expediente administrativo con los nombres de cursor publicados', () => {
        service.getAdminUser(7, { incidentLimit: 20, incidentCursorFecha: '2026-07-01T00:00:00Z', incidentCursorId: 4 }).subscribe();

        const request = http.expectOne(req => req.url === `${environment.apiUrl}admin/usuarios/7`);
        expect(request.request.params.get('incidentLimit')).toBe('20');
        expect(request.request.params.get('incidentCursorId')).toBe('4');
        request.flush({ success: true, Usuario: {}, Incidentes: [], SiguienteCursorIncidentes: null });
    });

    it('envia el cambio de rol con motivo obligatorio en el payload', () => {
        service.changeAdminUserRole(7, 2, 'Necesidad operativa').subscribe();

        const request = http.expectOne(`${environment.apiUrl}admin/usuarios/7/rol`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({ RolId: 2, Motivo: 'Necesidad operativa' });
        request.flush({ success: true });
    });

    it('envia filtros y cursor de auditoria sin valores vacios', () => {
        service.getAdminAudit({ modulo: 'cuentas', accion: '', actorId: 3, cursorFecha: '2026-07-01T00:00:00Z', cursorId: 9 }).subscribe();

        const request = http.expectOne(req => req.url === `${environment.apiUrl}admin/auditoria`);
        expect(request.request.params.get('modulo')).toBe('cuentas');
        expect(request.request.params.has('accion')).toBeFalse();
        expect(request.request.params.get('actorId')).toBe('3');
        expect(request.request.params.get('cursorId')).toBe('9');
        request.flush({ success: true, Registros: [], SiguienteCursor: null });
    });
});
