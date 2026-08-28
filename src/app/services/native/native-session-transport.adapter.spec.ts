import { TestBed } from '@angular/core/testing';
import type { CapacitorHttpPlugin } from '@capacitor/core/types/core-plugins';
import { environment } from '../../../environment/environment';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { NATIVE_HTTP, NativeSessionTransportAdapter } from './native-session-transport.adapter';

describe('NativeSessionTransportAdapter', () => {
    let http: jasmine.SpyObj<CapacitorHttpPlugin>;
    let adapter: NativeSessionTransportAdapter;

    beforeEach(() => {
        http = jasmine.createSpyObj<CapacitorHttpPlugin>('CapacitorHttp', ['request']);
        TestBed.configureTestingModule({
            providers: [
                NativeSessionTransportAdapter,
                { provide: NATIVE_HTTP, useValue: http },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });
        adapter = TestBed.inject(NativeSessionTransportAdapter);
    });

    it('restaura CSRF mediante el cookie jar nativo sin leer la cookie', async () => {
        http.request.and.resolveTo({
            status: 200,
            data: { success: true, CsrfToken: 'csrf-memory-only' },
            headers: {},
            url: `${environment.apiUrl}auth/session/csrf`
        });

        await expectAsync(adapter.restoreCsrf()).toBeResolvedTo({
            success: true,
            CsrfToken: 'csrf-memory-only'
        });
        expect(http.request).toHaveBeenCalledWith(jasmine.objectContaining({
            method: 'GET',
            url: `${environment.apiUrl}auth/session/csrf`,
            responseType: 'json'
        }));
    });

    it('envía CSRF en memoria al renovar la sesión', async () => {
        http.request.and.resolveTo({ status: 200, data: { Estado: 'authenticated' }, headers: {}, url: '' });

        await adapter.refresh('csrf-memory-only');

        expect(http.request).toHaveBeenCalledWith(jasmine.objectContaining({
            method: 'POST',
            headers: jasmine.objectContaining({ 'X-CSRF-Token': 'csrf-memory-only' })
        }));
    });
});
