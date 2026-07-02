import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { EntryService } from './entry.service';

describe('EntryService', () => {
    let service: EntryService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + 'entradas';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                EntryService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(EntryService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('creates entries for personajes through the shared entry endpoint', () => {
        service.create('personajes', 7, 3, [{ Nombre: 'Kaladin', Descripcion: 'Descripcion suficientemente larga' }]).subscribe();

        const req = httpMock.expectOne(`${apiUrl}/personajes/7`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            LibroId: 3,
            Entradas: [{ Nombre: 'Kaladin', Descripcion: 'Descripcion suficientemente larga' }]
        });
        req.flush([]);
    });
});

