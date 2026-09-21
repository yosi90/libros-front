import { HttpErrorResponse, HttpHeaders, HttpParams, HttpRequest, HttpResponse, HttpXhrBackend } from '@angular/common/http';
import type { CapacitorHttpPlugin } from '@capacitor/core/types/core-plugins';
import { firstValueFrom, of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NativeApiHttpBackend } from './native-api-http-backend';

describe('NativeApiHttpBackend', () => {
    let xhr: jasmine.SpyObj<HttpXhrBackend>;
    let nativeHttp: jasmine.SpyObj<CapacitorHttpPlugin>;

    beforeEach(() => {
        xhr = jasmine.createSpyObj<HttpXhrBackend>('HttpXhrBackend', ['handle']);
        nativeHttp = jasmine.createSpyObj<CapacitorHttpPlugin>('CapacitorHttp', ['request']);
    });

    it('envía los GET de la API por el transporte IPv4 nativo', async () => {
        nativeHttp.request.and.resolveTo({
            status: 200,
            data: [{ Id: 1 }],
            headers: { 'content-type': 'application/json' },
            url: `${environment.apiUrl}coleccion/universos?vista=mobile`
        });
        const backend = new NativeApiHttpBackend(xhr, nativeHttp, true);
        const request = new HttpRequest('GET', `${environment.apiUrl}coleccion/universos`, {
            params: new HttpParams().set('vista', 'mobile'),
            headers: new HttpHeaders({ Authorization: 'Bearer access' })
        });

        const response = await firstValueFrom(backend.handle(request));

        expect(response).toBeInstanceOf(HttpResponse);
        expect((response as HttpResponse<unknown>).body).toEqual([{ Id: 1 }]);
        expect(nativeHttp.request).toHaveBeenCalledWith(jasmine.objectContaining({
            method: 'GET',
            url: `${environment.apiUrl}coleccion/universos?vista=mobile`,
            callTimeout: 15000,
            headers: jasmine.objectContaining({ Authorization: 'Bearer access' })
        }));
        expect(xhr.handle).not.toHaveBeenCalled();
    });

    it('delega las mutaciones al backend normal de Angular', () => {
        const delegated = of(new HttpResponse({ status: 204 }));
        xhr.handle.and.returnValue(delegated);
        const backend = new NativeApiHttpBackend(xhr, nativeHttp, true);
        const request = new HttpRequest('POST', `${environment.apiUrl}coleccion/libros/1/estado`, {});

        expect(backend.handle(request)).toBe(delegated);
        expect(xhr.handle).toHaveBeenCalledOnceWith(request);
        expect(nativeHttp.request).not.toHaveBeenCalled();
    });

    it('delega también los GET cuando no está dentro de Android', () => {
        const delegated = of(new HttpResponse({ status: 200 }));
        xhr.handle.and.returnValue(delegated);
        const backend = new NativeApiHttpBackend(xhr, nativeHttp, false);
        const request = new HttpRequest('GET', `${environment.apiUrl}coleccion/universos`);

        expect(backend.handle(request)).toBe(delegated);
        expect(xhr.handle).toHaveBeenCalledOnceWith(request);
    });

    it('convierte una respuesta nativa no exitosa en HttpErrorResponse', async () => {
        nativeHttp.request.and.resolveTo({
            status: 503,
            data: { error: { code: 'temporarily_unavailable' } },
            headers: {},
            url: `${environment.apiUrl}coleccion/universos`
        });
        const backend = new NativeApiHttpBackend(xhr, nativeHttp, true);

        let failure: unknown;
        try {
            await firstValueFrom(backend.handle(new HttpRequest('GET', `${environment.apiUrl}coleccion/universos`)));
        } catch (error) {
            failure = error;
        }

        expect(failure).toBeInstanceOf(HttpErrorResponse);
        expect((failure as HttpErrorResponse).status).toBe(503);
    });
});
