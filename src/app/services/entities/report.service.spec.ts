import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { ReportService } from './report.service';

describe('ReportService', () => {
    let service: ReportService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ReportService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(ReportService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('creates review reports and resolves moderation groups', () => {
        service.create({
            TipoFuente: 'resena',
            EntidadTipo: 'libro',
            EntidadId: 7,
            UsuarioFuenteId: 12,
            Motivo: 'Contenido ofensivo'
        }).subscribe();

        let req = httpMock.expectOne(`${environment.apiUrl}reportes`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            TipoFuente: 'resena',
            EntidadTipo: 'libro',
            EntidadId: 7,
            UsuarioFuenteId: 12,
            Motivo: 'Contenido ofensivo'
        });
        req.flush({ success: true, Id: 1, GrupoId: 2, Estado: 'pendiente' });

        service.list('pendiente').subscribe();
        req = httpMock.expectOne(request => request.url === `${environment.apiUrl}moderacion/reportes`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('estado')).toBe('pendiente');
        req.flush([]);

        service.resolve(2, { Estado: 'aceptado', Comentario: 'Incumple las normas.' }).subscribe();
        req = httpMock.expectOne(`${environment.apiUrl}moderacion/reportes/2/resolver`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ Estado: 'aceptado', Comentario: 'Incumple las normas.' });
        req.flush({ success: true, Id: 2, Estado: 'aceptado' });
    });
});
