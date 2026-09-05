import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { SessionService } from '../auth/session.service';
import { BookService } from './book.service';
import { NewBook } from '../../interfaces/creation/newBook';

describe('BookService', () => {
    let service: BookService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + 'libros';
    const catalogAdminUrl = environment.apiUrl + 'catalogo/admin/libros';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                BookService,
                { provide: SessionService, useValue: { userId: 1 } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(BookService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('updates books through the catalog admin endpoint and refreshes the canonical detail', () => {
        const book: NewBook = {
            Id: 7,
            Nombre: 'El imperio final',
            Autores: [{ Id: 2, Nombre: 'Brandon Sanderson' }],
            Universo: { Id: 3, Nombre: 'Cosmere', Autores: [], Sagas: [], Libros: [], Antologias: [] },
            Saga: { Id: 4, Nombre: 'Nacidos de la bruma', Autores: [], Libros: [], Antologias: [] },
            Orden: 1,
            Paginas: 672
        };

        service.updateBook(book).subscribe(response => {
            expect(response.Id).toBe(7);
            expect(response.Nombre).toBe(book.Nombre);
        });

        const updateRequest = httpMock.expectOne(`${catalogAdminUrl}/7`);
        expect(updateRequest.request.method).toBe('PATCH');
        expect(updateRequest.request.body).toEqual({
            Nombre: 'El imperio final',
            ISBN: undefined,
            Paginas: 672,
            Sinopsis: undefined,
            FechaPublicacion: undefined,
            Orden: 1,
            Autores: [2],
            Estilos: undefined,
            SagaId: 4
        });
        updateRequest.flush({ Id: 7, TipoEntidad: 'libro' });

        const detailRequest = httpMock.expectOne(`${apiUrl}/7`);
        expect(detailRequest.request.method).toBe('GET');
        detailRequest.flush({ Id: 7, Nombre: 'El imperio final' });
    });

    it('replaces book languages through the catalog admin endpoint', () => {
        service.updateBookLanguages(7, { Idiomas: [1, { Id: 2 }] }).subscribe(response => {
            expect(response.Id).toBe(7);
        });

        const updateRequest = httpMock.expectOne(`${catalogAdminUrl}/7`);
        expect(updateRequest.request.method).toBe('PATCH');
        expect(updateRequest.request.body).toEqual({ Idiomas: [1, 2] });
        updateRequest.flush({ Id: 7, TipoEntidad: 'libro' });

        const detailRequest = httpMock.expectOne(`${apiUrl}/7`);
        expect(detailRequest.request.method).toBe('GET');
        detailRequest.flush({ Id: 7, Nombre: 'El imperio final' });
    });

    it('loads an anthology section through its contextual endpoint', () => {
        service.getAnthologySection(31).subscribe(response => expect(response.Id).toBe(31));

        const request = httpMock.expectOne(`${environment.apiUrl}antologias/secciones/31`);
        expect(request.request.method).toBe('GET');
        request.flush({ Id: 31, Nombre: 'El Alma del Emperador' });
    });

    it('creates a book with JSON and uploads its cover through the image endpoint', () => {
        const book: NewBook = {
            Id: 0,
            Nombre: 'La mano izquierda de la oscuridad',
            Autores: [{ Id: 4, Nombre: 'Ursula K. Le Guin' }],
            Universo: { Id: 3, Nombre: 'Ekumen', Autores: [], Sagas: [], Libros: [], Antologias: [] },
            Saga: { Id: 0, Nombre: 'Sin saga', Autores: [], Libros: [], Antologias: [] },
            Orden: -1
        };
        const cover = new File(['cover'], 'cover.webp', { type: 'image/webp' });

        service.addBook(book, cover).subscribe(response => expect(response.Id).toBe(13));

        const createRequest = httpMock.expectOne(catalogAdminUrl);
        expect(createRequest.request.method).toBe('POST');
        expect(createRequest.request.body).toEqual(jasmine.objectContaining({
            Nombre: book.Nombre,
            Autores: [4],
            UniversoId: 3
        }));
        createRequest.flush({ Id: 13, TipoEntidad: 'libro' });

        httpMock.expectOne(`${apiUrl}/13`).flush({ Id: 13, Nombre: book.Nombre, Portada: 'b_1_13.png' });

        const coverRequest = httpMock.expectOne(`${environment.setImgUrl}cover/b_1_13.png`);
        expect(coverRequest.request.method).toBe('POST');
        expect(coverRequest.request.body instanceof FormData).toBeTrue();
        expect(coverRequest.request.body.get('image')).toBe(cover);
        coverRequest.flush({ success: true });
    });
});
