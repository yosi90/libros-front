import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
    let service: ModerationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(ModerationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('lists administrative sanctions with their documented filters', () => {
        service.listSanctions({ userId: 7, activeOnly: true, limit: 25, offset: 50 }).subscribe();

        const request = httpMock.expectOne(req => req.url === `${environment.apiUrl}moderacion/admin/sanciones`);
        expect(request.request.method).toBe('GET');
        expect(request.request.params.get('userId')).toBe('7');
        expect(request.request.params.get('activeOnly')).toBe('true');
        expect(request.request.params.get('limit')).toBe('25');
        expect(request.request.params.get('offset')).toBe('50');
        request.flush({ success: true, Sanciones: [], limit: 25, offset: 50 });
    });

    it('sends a mandatory reason when revoking active user sanctions', () => {
        service.revokeUserSanctions(9, 'Resolución de alegación aceptada').subscribe();

        const request = httpMock.expectOne(`${environment.apiUrl}moderacion/admin/usuarios/9/sanciones`);
        expect(request.request.method).toBe('DELETE');
        expect(request.request.body).toEqual({ Motivo: 'Resolución de alegación aceptada' });
        request.flush({ success: true, Revocadas: 1, SancionActiva: { Id: 4, Estado: 'revoked' } });
    });

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
            Medida: 'mensaje_ocultado'
        }).subscribe(result => expect(result).toEqual({ Id: 12, Estado: 'aceptada' }));

        const request = httpMock.expectOne(`${environment.apiUrl}moderacion/comunidad/denuncias/12/resolver`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({
            Estado: 'aceptada',
            Comentario: 'Contenido contrario a la política.',
            Medida: 'mensaje_ocultado'
        });
        request.flush({ success: true, Id: 12, Estado: 'aceptada' });
    });
});
