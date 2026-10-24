import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
    let service: ModerationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
        service = TestBed.inject(ModerationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('lists community report groups using the documented status filter', () => {
        service.listCommunityReports('aceptada').subscribe(reports => expect(reports).toEqual([]));

        const request = httpMock.expectOne(req => req.url === `${environment.apiUrl}moderacion/comunidad/denuncias`);
        expect(request.request.method).toBe('GET');
        expect(request.request.params.get('estado')).toBe('aceptada');
        expect(request.request.params.has('limit')).toBeFalse();
        expect(request.request.params.has('offset')).toBeFalse();
        request.flush({ success: true, Grupos: [] });
    });

    it('resolves a community report with an explicit content measure', () => {
        service.resolveCommunityReport(12, {
            Estado: 'aceptada',
            Comentario: 'Contenido contrario a la política.',
            Medida: 'club_retirado_descubrimiento'
        }).subscribe(result => expect(result).toEqual({ Id: 12, Estado: 'aceptada' }));

        const request = httpMock.expectOne(`${environment.apiUrl}moderacion/comunidad/denuncias/12/resolver`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({
            Estado: 'aceptada',
            Comentario: 'Contenido contrario a la política.',
            Medida: 'club_retirado_descubrimiento'
        });
        request.flush({ success: true, Id: 12, Estado: 'aceptada' });
    });
});
