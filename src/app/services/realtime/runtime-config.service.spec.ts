import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
    let service: RuntimeConfigService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(RuntimeConfigService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('keeps Firebase disabled unless the runtime document enables it', async () => {
        const loading = service.load();
        const request = httpMock.expectOne('assets/runtime-config.json');
        request.flush({ firebase: { enabled: true, projectId: 'demo-libros-api' } });
        await loading;

        expect(service.firebase.enabled).toBeTrue();
        expect(service.firebase.projectId).toBe('demo-libros-api');
        expect(service.firebase.apiKey).toBe('');
    });
});
