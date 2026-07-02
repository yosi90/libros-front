import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { NarrativeEntityService } from './narrative-entity.service';

describe('NarrativeEntityService', () => {
    let service: NarrativeEntityService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                NarrativeEntityService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(NarrativeEntityService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('requests location states', () => {
        service.getLocationStates().subscribe(states => {
            expect(states).toEqual([{ Id: 1, Nombre: 'Activa' }]);
        });

        const req = httpMock.expectOne(`${environment.apiUrl}estado_localizacion/catalogo`);
        expect(req.request.method).toBe('GET');
        req.flush([{ Id: 1, Nombre: 'Activa' }]);
    });

    it('updates narrative entity roots through PATCH endpoints', () => {
        service.updateLocation(2, { LibroId: 1, Nombre: 'Kholinar', EstadoId: 3 }).subscribe();
        let req = httpMock.expectOne(`${environment.apiUrl}localizaciones/2`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ LibroId: 1, Nombre: 'Kholinar', EstadoId: 3 });
        req.flush({ success: true });

        service.updateConcept(3, { LibroId: 1, Nombre: 'Investidura' }).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}conceptos/3`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ LibroId: 1, Nombre: 'Investidura' });
        req.flush({ success: true });

        service.updateOrganization(4, { LibroId: 1, Nombre: 'Puente cuatro' }).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}organizaciones/4`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ LibroId: 1, Nombre: 'Puente cuatro' });
        req.flush({ success: true });

        service.updateEvent(5, { LibroId: 1, Nombre: 'Batalla', Id_Localizacion: 2, Personajes: [10] }).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}eventos/5`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ LibroId: 1, Nombre: 'Batalla', Id_Localizacion: 2, Personajes: [10] });
        req.flush({ success: true });

        service.updateQuote(6, { LibroId: 1, Nombre: 'Juramento', Pagina: 42, PersonajeId: 10 }).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}citas/6`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ LibroId: 1, Nombre: 'Juramento', Pagina: 42, PersonajeId: 10 });
        req.flush({ success: true });
    });

    it('detaches narrative entities from the current book', () => {
        service.detachLocationFromBook(2, 1).subscribe();
        let req = httpMock.expectOne(`${environment.apiUrl}localizaciones/2/libros/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });

        service.detachConceptFromBook(3, 1).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}conceptos/3/libros/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });

        service.detachOrganizationFromBook(4, 1).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}organizaciones/4/libros/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });

        service.detachEventFromBook(5, 1).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}eventos/5/libros/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });

        service.detachQuoteFromBook(6, 1).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}citas/6/libros/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });
    });
});
