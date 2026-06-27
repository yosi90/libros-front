import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
    let service: CatalogService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + 'catalogo';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                CatalogService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(CatalogService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('sends catalog book filters as query params', () => {
        service.getBooks({
            q: 'imperio',
            autorId: 1,
            universoId: 2,
            sagaId: 3,
            idiomaId: 4,
            estiloId: 5,
            estadoId: 4,
            puntuacionMin: 3
        }).subscribe();

        const req = httpMock.expectOne(request => request.url === `${apiUrl}/libros`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('q')).toBe('imperio');
        expect(req.request.params.get('autorId')).toBe('1');
        expect(req.request.params.get('universoId')).toBe('2');
        expect(req.request.params.get('sagaId')).toBe('3');
        expect(req.request.params.get('idiomaId')).toBe('4');
        expect(req.request.params.get('estiloId')).toBe('5');
        expect(req.request.params.get('estadoId')).toBe('4');
        expect(req.request.params.get('puntuacionMin')).toBe('3');
        req.flush([]);
    });

    it('omits empty catalog query params', () => {
        service.getAnthologies({ q: '', autorId: undefined, estadoId: null as never }).subscribe();

        const req = httpMock.expectOne(request => request.url === `${apiUrl}/antologias`);
        expect(req.request.params.keys()).toEqual([]);
        req.flush([]);
    });

    it('requests origin places as paginated autocomplete', () => {
        service.getOriginPlaces('estados', 2, 10).subscribe(page => {
            expect(page.Items).toEqual([{ Id: 1, Nombre: 'Estados Unidos' }]);
            expect(page.Page).toBe(2);
            expect(page.PageSize).toBe(10);
            expect(page.Total).toBe(1);
            expect(page.HasMore).toBeFalse();
        });

        const req = httpMock.expectOne(request => request.url === `${apiUrl}/lugares-origen`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('q')).toBe('estados');
        expect(req.request.params.get('page')).toBe('2');
        expect(req.request.params.get('pageSize')).toBe('10');
        req.flush({
            Items: [{ Id: 1, Nombre: 'Estados Unidos' }],
            Page: 2,
            PageSize: 10,
            Total: 1,
            HasMore: false
        });
    });

    it('requests public book and anthology details', () => {
        service.getBookPublicDetail(7).subscribe();
        let req = httpMock.expectOne(`${apiUrl}/libros/7/detalle-publico`);
        expect(req.request.method).toBe('GET');
        req.flush({ Id: 7, Tipo: 'libro', Nombre: 'Alas de hierro', Portada: null, Autores: [], Estadisticas: {} });

        service.getAnthologyPublicDetail(9).subscribe();
        req = httpMock.expectOne(`${apiUrl}/antologias/9/detalle-publico`);
        expect(req.request.method).toBe('GET');
        req.flush({ Id: 9, Tipo: 'antologia', Nombre: 'Relatos', Portada: null, Autores: [], Estadisticas: {} });
    });
});
