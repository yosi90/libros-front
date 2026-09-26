import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CoverCacheService } from '../cover-cache.service';
import { writeCatalogAdmin } from './catalog-admin-write';

describe('writeCatalogAdmin', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    const coverCache = jasmine.createSpyObj<CoverCacheService>('CoverCacheService', ['invalidateCover']);

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        coverCache.invalidateCover.calls.reset();
    });

    afterEach(() => httpMock.verify());

    it('envía JSON cuando no hay portada', () => {
        writeCatalogAdmin(http, coverCache, 'patch', '/catalogo/admin/libros/5', { Nombre: 'Siega' }).subscribe();

        const request = httpMock.expectOne('/catalogo/admin/libros/5');
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({ Nombre: 'Siega' });
        request.flush({ Id: 5, TipoEntidad: 'libro' });
        expect(coverCache.invalidateCover).not.toHaveBeenCalled();
    });

    it('envía datos y portada juntos en multipart e invalida la portada guardada', () => {
        const image = new File(['png'], 'portada.png', { type: 'image/png' });
        writeCatalogAdmin(http, coverCache, 'post', '/catalogo/admin/libros', { Nombre: 'Siega' }, image).subscribe();

        const request = httpMock.expectOne('/catalogo/admin/libros');
        const body = request.request.body as FormData;
        expect(body instanceof FormData).toBeTrue();
        expect(JSON.parse(body.get('payload') as string)).toEqual({ Nombre: 'Siega' });
        expect((body.get('image') as File).name).toBe('portada.png');
        request.flush({ Id: 9, TipoEntidad: 'libro', Portada: 'siega.png' });
        expect(coverCache.invalidateCover).toHaveBeenCalledWith('siega.png');
    });
});
