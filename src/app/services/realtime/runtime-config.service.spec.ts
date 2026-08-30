import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RuntimeConfigService } from './runtime-config.service';
import { environment } from '../../../environment/environment';
import type { CapacitorHttpPlugin } from '@capacitor/core/types/core-plugins';
import { NATIVE_HTTP } from '../native/native-session-transport.adapter';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

describe('RuntimeConfigService', () => {
    let service: RuntimeConfigService;
    let httpMock: HttpTestingController;
    const originalApiUrl = environment.apiUrl;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: NATIVE_HTTP, useValue: {} },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: false }
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

describe('RuntimeConfigService en Android', () => {
    beforeEach(() => localStorage.clear());

    it('carga la configuración con HTTP nativo y no depende de la red del WebView', async () => {
        const nativeHttp = jasmine.createSpyObj<CapacitorHttpPlugin>('CapacitorHttp', ['request']);
        nativeHttp.request.and.resolveTo({
            status: 200,
            data: {
                success: true,
                Environment: 'qa',
                QaDatasetVersion: '2026.08.local.2',
                RealtimeWsUrl: 'wss://qa-ws.yosiftware.es',
                Firebase: {
                    ApiKey: 'public-key',
                    AuthDomain: 'libros-qa.firebaseapp.com',
                    ProjectId: 'libros-qa',
                    MessagingSenderId: '123',
                    AppId: 'app-id',
                    DatabaseURL: 'https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app',
                    Providers: { Google: true, Phone: true }
                }
            },
            headers: {},
            url: environment.runtimeConfigUrl
        });
        TestBed.configureTestingModule({
            providers: [
                RuntimeConfigService,
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: NATIVE_HTTP, useValue: nativeHttp },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });

        const service = TestBed.inject(RuntimeConfigService);
        await service.load();

        expect(nativeHttp.request).toHaveBeenCalledWith(jasmine.objectContaining({
            method: 'GET',
            url: environment.runtimeConfigUrl,
            responseType: 'json'
        }));
        expect(service.firebase.enabled).toBeTrue();
        expect(service.firebase.providers.google).toBeTrue();
        expect(service.firebase.providers.phone).toBeTrue();
    });

    it('reutiliza la configuración pública y la revalida sin bloquear otro arranque', async () => {
        const nativeHttp = jasmine.createSpyObj<CapacitorHttpPlugin>('CapacitorHttp', ['request']);
        nativeHttp.request.and.returnValue(new Promise(() => void 0));
        localStorage.setItem(`runtimeConfig:${environment.runtimeConfigUrl}`, JSON.stringify({
            success: true,
            Environment: 'qa',
            QaDatasetVersion: null,
            RealtimeWsUrl: 'wss://qa-ws.yosiftware.es',
            Firebase: {
                ApiKey: 'public-key', AuthDomain: 'qa-libros.yosiftware.es', ProjectId: 'libros-qa',
                MessagingSenderId: '123', AppId: 'app-id', DatabaseURL: 'https://database.example',
                Providers: { Google: true, Phone: true }
            }
        }));
        TestBed.configureTestingModule({
            providers: [
                RuntimeConfigService,
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: NATIVE_HTTP, useValue: nativeHttp },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });

        const service = TestBed.inject(RuntimeConfigService);
        await service.load();

        expect(service.firebase.enabled).toBeTrue();
        expect(service.firebase.providers.google).toBeTrue();
        expect(nativeHttp.request).toHaveBeenCalledTimes(1);
    });
});
