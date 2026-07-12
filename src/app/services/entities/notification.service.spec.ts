import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let service: NotificationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(NotificationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('uses the stable cursor to list unread notifications', () => {
        service.list({ limit: 25, read: 'no_leidas', cursor: { FechaCreacion: '2026-07-12T10:00:00Z', Id: 4 } }).subscribe();
        const request = httpMock.expectOne(req => req.url === `${environment.apiUrl}notificaciones`);
        expect(request.request.params.get('limit')).toBe('25');
        expect(request.request.params.get('lectura')).toBe('no_leidas');
        expect(request.request.params.get('cursorId')).toBe('4');
        request.flush({ success: true, Notificaciones: [], NoLeidas: 0, SiguienteCursor: null });
    });
});
