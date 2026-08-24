import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NewBook } from '../../interfaces/creation/newBook';
import { NewSaga } from '../../interfaces/creation/newSaga';
import { Universe } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';
import { CoverCacheService } from '../cover-cache.service';
import { AntologyService } from './antology.service';
import { AuthorService } from './author.service';
import { SagaService } from './saga.service';
import { UniverseService } from './universe.service';

describe('Catalog admin write services', () => {
    let httpMock: HttpTestingController;
    let authorService: AuthorService;
    let universeService: UniverseService;
    let sagaService: SagaService;
    let antologyService: AntologyService;
    const apiUrl = environment.apiUrl;
    const coverCache = jasmine.createSpyObj<CoverCacheService>('CoverCacheService', ['getCoverFile', 'invalidateCover', 'setCover']);
    const universe: Universe = {
        Id: 3,
        Nombre: 'Cosmere',
        Autores: [],
        Sagas: [],
        Libros: [],
        Antologias: []
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AuthorService,
                UniverseService,
                SagaService,
                AntologyService,
                { provide: CoverCacheService, useValue: coverCache },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        });

        httpMock = TestBed.inject(HttpTestingController);
        authorService = TestBed.inject(AuthorService);
        universeService = TestBed.inject(UniverseService);
        sagaService = TestBed.inject(SagaService);
        antologyService = TestBed.inject(AntologyService);
        coverCache.invalidateCover.calls.reset();
        coverCache.setCover.calls.reset();
        coverCache.setCover.and.returnValue(of({ success: true }));
    });

    afterEach(() => httpMock.verify());

    it('creates authors through catalog admin and returns the canonical author', () => {
        authorService.addAuthor({
            Id: 0,
            Nombre: 'Ursula K. Le Guin',
            IdiomaId: 2,
            LugarOrigenNombre: 'Berkeley'
        }).subscribe(author => expect(author.Id).toBe(11));

        const createRequest = httpMock.expectOne(`${apiUrl}catalogo/admin/autores`);
        expect(createRequest.request.method).toBe('POST');
        expect(createRequest.request.body).toEqual({
            Nombre: 'Ursula K. Le Guin',
            IdiomaId: 2,
            LugarOrigenNombre: 'Berkeley'
        });
        createRequest.flush({ Id: 11, TipoEntidad: 'autor' });

        const detailRequest = httpMock.expectOne(`${apiUrl}autores/11`);
        expect(detailRequest.request.method).toBe('GET');
        detailRequest.flush({ Id: 11, Nombre: 'Ursula K. Le Guin' });
    });

    it('updates universes through catalog admin and returns the canonical universe', () => {
        universeService.updateUniverse({
            Id: 3,
            Nombre: 'Cosmere',
            Autores: [{ Id: 7 }]
        }).subscribe(response => expect(response.Id).toBe(3));

        const updateRequest = httpMock.expectOne(`${apiUrl}catalogo/admin/universos/3`);
        expect(updateRequest.request.method).toBe('PATCH');
        expect(updateRequest.request.body).toEqual({ Nombre: 'Cosmere', Autores: [7] });
        updateRequest.flush({ Id: 3, TipoEntidad: 'universo' });

        httpMock.expectOne(`${apiUrl}universos/3`).flush(universe);
    });

    it('loads private universe metrics from their dedicated endpoint', () => {
        universeService.getMetrics().subscribe(metrics => expect(metrics.Resumen.Libros.Total).toBe(6));

        const request = httpMock.expectOne(`${apiUrl}universos/metricas`);
        expect(request.request.method).toBe('GET');
        request.flush({
            Resumen: {
                Libros: { Total: 6 },
                Antologias: { Total: 1 },
                Secciones: { Total: 2 }
            },
            ComprasUltimosMeses: [],
            LibroMasRapido: null,
            TopLibrosMasRapidos: [],
            LibroMasTiempoPendiente: null,
            PersonajeMasRecurrente: null,
            PorUniverso: {}
        });
    });

    it('creates sagas through catalog admin and returns the canonical saga', () => {
        const saga: NewSaga = {
            Id: 0,
            Nombre: 'Terramar',
            Subtitulo: 'Ciclo de Terramar',
            Autores: [{ Id: 11, Nombre: 'Ursula K. Le Guin' }],
            Universo: universe
        };

        sagaService.addSaga(saga).subscribe(response => expect(response.Id).toBe(8));

        const createRequest = httpMock.expectOne(`${apiUrl}catalogo/admin/sagas`);
        expect(createRequest.request.method).toBe('POST');
        expect(createRequest.request.body).toEqual({
            Nombre: 'Terramar',
            Subtitulo: 'Ciclo de Terramar',
            Autores: [11],
            UniversoId: 3
        });
        createRequest.flush({ Id: 8, TipoEntidad: 'saga' });

        httpMock.expectOne(`${apiUrl}sagas/8`).flush({ Id: 8, Nombre: 'Terramar' });
    });

    it('updates anthologies with JSON and uploads their cover through the documented image endpoint', () => {
        const antology: NewBook = {
            Id: 9,
            Nombre: 'Relatos de Terramar',
            Autores: [{ Id: 11, Nombre: 'Ursula K. Le Guin' }],
            Universo: universe,
            Saga: { Id: 0, Nombre: 'Sin saga', Autores: [], Libros: [], Antologias: [] },
            Orden: 2,
            ISBN: '9780000000000',
            Estilos: [{ Id: 5 }]
        };
        const cover = new File(['cover'], 'cover.webp', { type: 'image/webp' });

        antologyService.updateAntology(antology, cover).subscribe(response => expect(response.Id).toBe(9));

        const updateRequest = httpMock.expectOne(`${apiUrl}catalogo/admin/antologias/9`);
        expect(updateRequest.request.method).toBe('PATCH');
        expect(updateRequest.request.body).toEqual({
            Nombre: 'Relatos de Terramar',
            ISBN: '9780000000000',
            Paginas: undefined,
            Sinopsis: undefined,
            FechaPublicacion: undefined,
            Orden: 2,
            Autores: [11],
            Estilos: [5],
            UniversoId: 3
        });
        updateRequest.flush({ Id: 9, TipoEntidad: 'antologia' });

        httpMock.expectOne(`${apiUrl}antologias/9`).flush({ Id: 9, Nombre: antology.Nombre, Portada: 'cover.webp' });
        expect(coverCache.setCover).toHaveBeenCalledWith('cover.webp', cover);
    });
});
