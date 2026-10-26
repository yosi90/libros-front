import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { BookTitleService } from './book-title.service';

describe('BookTitleService', () => {
    const url = `${environment.apiUrl}coleccion/libros/7/titulo`;
    const response = { success: true, Titulo: 'Bailando entre Brumas y Ceniza ⚙️ (¬‿¬)☁️✨', Html: null, Estilos: null, Generaciones: { Hoy: 2, Limite: 10 } };
    let service: BookTitleService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
        service = TestBed.inject(BookTitleService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('lee el título de un libro de la colección', () => {
        let title: string | null | undefined;
        service.get(7).subscribe(value => title = value.Titulo);
        const request = http.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush(response);
        expect(title).toBe(response.Titulo);
    });

    it('lo escribe a mano, y null lo quita', () => {
        service.save(7, 'Mi frase').subscribe();
        const write = http.expectOne(url);
        expect(write.request.method).toBe('PUT');
        expect(write.request.body).toEqual({ Titulo: 'Mi frase' });
        write.flush(response);

        service.save(7, null).subscribe();
        expect(http.expectOne(url).request.body).toEqual({ Titulo: null });
    });

    it('lo genera con el modelo y el proveedor elegidos', () => {
        service.generate(7, 'gpt-5.4-mini', 'openai').subscribe();
        const request = http.expectOne(`${url}/generar`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ Modelo: 'gpt-5.4-mini', Proveedor: 'openai' });
        request.flush(response);
    });
});
