import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { CoverCacheService } from '../cover-cache.service';
import { CatalogEditionAdminService } from './catalog-edition-admin.service';

describe('CatalogEditionAdminService', () => {
    let service: CatalogEditionAdminService;
    let httpMock: HttpTestingController;
    let coverCache: jasmine.SpyObj<CoverCacheService>;

    beforeEach(() => {
        coverCache = jasmine.createSpyObj<CoverCacheService>('CoverCacheService', ['invalidateCover']);
        TestBed.configureTestingModule({ providers: [
            CatalogEditionAdminService,
            { provide: CoverCacheService, useValue: coverCache },
            provideHttpClient(withXhr()), provideHttpClientTesting()
        ] });
        service = TestBed.inject(CatalogEditionAdminService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('creates an edition under its work and edits it by edition ID with multipart cover', () => {
        service.addBookEdition(73, { ISBN: '9780306406157', FechaPublicacion: '2026-01' }).subscribe();
        const create = httpMock.expectOne(`${environment.apiUrl}catalogo/admin/libros/73/ediciones`);
        expect(create.request.method).toBe('POST');
        expect(create.request.body).toEqual({ ISBN: '9780306406157', FechaPublicacion: '2026-01' });
        create.flush({ Id: 312, ISBN: '9780306406157', Portada: 'first.png' });

        const image = new File(['cover'], 'cover.png', { type: 'image/png' });
        service.updateEdition(312, { FechaPublicacion: '2026-02' }, image).subscribe();
        const update = httpMock.expectOne(`${environment.apiUrl}catalogo/admin/ediciones/312`);
        expect(update.request.method).toBe('PATCH');
        expect(update.request.body instanceof FormData).toBeTrue();
        const form = update.request.body as FormData;
        expect(JSON.parse(form.get('payload') as string)).toEqual({ FechaPublicacion: '2026-02' });
        expect(form.get('image')).toBe(image);
        update.flush({ Id: 312, ISBN: '9780306406157', Portada: 'updated.png' });
        expect(coverCache.invalidateCover).toHaveBeenCalledWith('updated.png');
    });

    it('links an existing edition to an anthology through an explicit request', () => {
        service.addAnthologyEdition(8, { VincularEdicionId: 312 }).subscribe();
        const request = httpMock.expectOne(`${environment.apiUrl}catalogo/admin/antologias/8/ediciones`);
        expect(request.request.body).toEqual({ VincularEdicionId: 312 });
        request.flush({ Id: 312, ISBN: '9780306406157' });
    });
});
