import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { environment } from '../../../environment/environment';

describe('UserService', () => {
    let service: UserService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                UserService,
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
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
});
