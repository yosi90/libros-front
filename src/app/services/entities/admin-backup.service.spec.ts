import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { AdminBackupService } from './admin-backup.service';

describe('AdminBackupService', () => {
    let service: AdminBackupService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(AdminBackupService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('downloads the protected backup as a full blob response', () => {
        service.download().subscribe(response => expect(response.body).toEqual(jasmine.any(Blob)));

        const request = http.expectOne(`${environment.apiUrl}admin/backup`);
        expect(request.request.method).toBe('GET');
        expect(request.request.responseType).toBe('blob');
        request.flush(new Blob(['zip'], { type: 'application/zip' }));
    });
});
