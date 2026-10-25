import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { PlatformSessionService } from '../auth/platform-session.service';
import { BookService } from './book.service';

describe('BookService', () => {
    let service: BookService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                BookService,
                { provide: PlatformSessionService, useValue: { userId: 1 } },
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

    it('loads an anthology section through its contextual endpoint', () => {
        service.getAnthologySection(31).subscribe(response => {
            expect(response.Id).toBe(31);
            expect(response.Nombre).toBe('El Alma del Emperador');
            expect(response.Capitulos.map(chapter => chapter.Id)).toEqual([301]);
            expect(response.Interludios.map(interlude => interlude.Id)).toEqual([401]);
            expect(response.Personajes.map(character => character.Id)).toEqual([501]);
            expect(response.Universo).toEqual({ Id: 1, Nombre: 'Cosmere' });
        });

        const request = httpMock.expectOne(`${environment.apiUrl}antologias/secciones/31`);
        expect(request.request.method).toBe('GET');
        request.flush({
            Antologia: { Id: '4', Nombre: 'Arcanum ilimitado' },
            Libro: {
                Id: '31', Nombre: 'El Alma del Emperador', Orden: 1, Portada: 'alma.webp',
                Autores: [], Estados: [], Universo: { Id: 1, Nombre: 'Cosmere' }, Saga: null,
                Capitulos: [{ Id: 301, Nombre: 'Prólogo', Orden: 1, Pagina: 1, Escenas: [] }],
                Partes: [],
                Interludios: [{ Id: 401, Nombre: 'Interludio', Orden_cap: null, Orden_part: null, Pagina: 20, Capitulos: [] }],
                Personajes: [{ Id: 501, Nombre: 'Shai' }],
                Localizaciones: [], Conceptos: [], Organizaciones: [], Eventos: [], Citas: []
            },
            PaginaInicio: '89',
            PaginaFinal: '176'
        });
    });
});
