import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { CharacterService } from './character.service';

describe('CharacterService', () => {
    let service: CharacterService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + 'personajes';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                CharacterService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(CharacterService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('requests character state catalog', () => {
        service.getStateCatalog().subscribe(states => {
            expect(states).toEqual([{ Id: 1, Nombre: 'Vivo' }]);
        });

        const req = httpMock.expectOne(`${apiUrl}/estados/catalogo`);
        expect(req.request.method).toBe('GET');
        req.flush([{ Id: 1, Nombre: 'Vivo' }]);
    });

    it('updates root character data through the planned PATCH endpoint', () => {
        service.updateRoot(7, { Sexo: 1 }).subscribe();

        const req = httpMock.expectOne(`${apiUrl}/7`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ Sexo: 1 });
        req.flush({ success: true });
    });

    it('detaches a character from a book without deleting it globally', () => {
        service.detachFromBook(7, 3).subscribe();

        const req = httpMock.expectOne(`${apiUrl}/7/libros/3`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });
    });
});
