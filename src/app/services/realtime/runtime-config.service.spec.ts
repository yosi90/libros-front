import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RuntimeConfigService } from './runtime-config.service';
import { environment } from '../../../environment/environment';

describe('RuntimeConfigService', () => {
    let service: RuntimeConfigService;
    let httpMock: HttpTestingController;
    const originalApiUrl = environment.apiUrl;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(RuntimeConfigService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        environment.apiUrl = originalApiUrl;
    });

    it('normalizes the public backend runtime contract', async () => {
        const loading = service.load();
        const request = httpMock.expectOne(environment.runtimeConfigUrl);
        request.flush({
            success: true,
            Environment: 'qa',
            QaDatasetVersion: '2026.08.local.2',
            RealtimeWsUrl: 'wss://qa-ws.yosiftware.es',
            Firebase: {
                ApiKey: 'public-key',
                AuthDomain: 'libros-qa.firebaseapp.com',
                ProjectId: 'libros-qa',
                StorageBucket: 'libros-qa.firebasestorage.app',
                MessagingSenderId: '123',
                AppId: 'app-id',
                DatabaseURL: 'https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app',
                VapidKey: 'vapid'
            }
        });
        await loading;

        expect(service.firebase.enabled).toBeTrue();
        expect(service.firebase.projectId).toBe('libros-qa');
        expect(service.firebase.storageBucket).toBe('libros-qa.firebasestorage.app');
        expect(service.api.environmentId).toBe('qa');
        expect(service.api.qaDatasetVersion).toBe('2026.08.local.2');
        expect(service.api.realtimeWsUrl).toBe('wss://qa-ws.yosiftware.es');
        expect(environment.apiUrl).toBe(originalApiUrl);
    });

    it('degrades Firebase and realtime when runtime config cannot be loaded', async () => {
        const loading = service.load();
        httpMock.expectOne(environment.runtimeConfigUrl).flush({}, { status: 503, statusText: 'Unavailable' });
        await loading;

        expect(service.firebase.enabled).toBeFalse();
        expect(service.api.environmentId).toBe('');
        expect(service.api.realtimeWsUrl).toBe('');
    });

    it('libera el arranque si runtime config no responde', fakeAsync(() => {
        let completed = false;
        void service.load().then(() => completed = true);
        httpMock.expectOne(environment.runtimeConfigUrl);

        tick(12_001);
        flushMicrotasks();

        expect(completed).toBeTrue();
        expect(service.firebase.enabled).toBeFalse();
        expect(service.api.environmentId).toBe('');
    }));
});
