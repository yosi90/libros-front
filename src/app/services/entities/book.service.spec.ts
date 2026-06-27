import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { BookService } from './book.service';

describe('BookService', () => {
    let service: BookService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + 'libros';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                BookService,
                { provide: SessionService, useValue: { userId: 1 } },
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(BookService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('adds book languages through the documented endpoint', () => {
        service.addBookLanguages(7, { Idiomas: [1, { Id: 2 }] }).subscribe(response => {
            expect(response.LibroId).toBe(7);
            expect(response.IdiomasDisponibles.length).toBe(2);
        });

        const req = httpMock.expectOne(`${apiUrl}/7/idiomas`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ Idiomas: [1, { Id: 2 }] });
        req.flush({
            success: true,
            LibroId: 7,
            IdiomasDisponibles: [
                { Id: 1, Codigo: 'es', Nombre: 'Español' },
                { Id: 2, Codigo: 'en', Nombre: 'Inglés' }
            ]
        });
    });
});
