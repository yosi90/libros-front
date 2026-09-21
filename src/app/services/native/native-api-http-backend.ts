import {
    HttpBackend,
    HttpErrorResponse,
    HttpEvent,
    HttpHeaders,
    HttpRequest,
    HttpResponse,
    HttpXhrBackend
} from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import type { CapacitorHttpPlugin, HttpResponse as NativeHttpResponse } from '@capacitor/core/types/core-plugins';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { NATIVE_HTTP } from './native-session-transport.adapter';

/**
 * Capacitor's patched XHR sends GET requests through a WebView proxy instead of
 * the CapacitorHttp plugin. On Android that bypasses our IPv4-first DNS policy.
 * Keep mutations on the stock backend and route API reads through the native
 * plugin explicitly.
 */
@Injectable()
export class NativeApiHttpBackend implements HttpBackend {
    constructor(
        private readonly xhr: HttpXhrBackend,
        @Inject(NATIVE_HTTP) private readonly nativeHttp: CapacitorHttpPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private readonly nativeMobile: boolean
    ) { }

    handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
        if (!this.shouldUseNativeRead(request))
            return this.xhr.handle(request);

        return new Observable(observer => {
            let subscribed = true;
            const options = {
                method: request.method,
                url: request.urlWithParams,
                headers: this.toNativeHeaders(request.headers),
                responseType: request.responseType,
                connectTimeout: 3_000,
                readTimeout: 15_000,
                callTimeout: 15_000
            };
            void this.nativeHttp.request(options).then(response => {
                if (!subscribed) return;
                if (response.status < 200 || response.status >= 300) {
                    observer.error(this.toError(response, request.urlWithParams));
                    return;
                }
                observer.next(new HttpResponse({
                    body: this.toAngularBody(response, request.responseType),
                    headers: new HttpHeaders(response.headers),
                    status: response.status,
                    statusText: 'OK',
                    url: response.url || request.urlWithParams
                }));
                observer.complete();
            }).catch(error => {
                if (!subscribed) return;
                observer.error(error instanceof HttpErrorResponse ? error : new HttpErrorResponse({
                    error,
                    status: 0,
                    statusText: 'Native HTTP error',
                    url: request.urlWithParams
                }));
            });
            return () => { subscribed = false; };
        });
    }

    private shouldUseNativeRead(request: HttpRequest<unknown>): boolean {
        return this.nativeMobile
            && (request.method === 'GET' || request.method === 'HEAD')
            && request.url.startsWith(environment.apiUrl);
    }

    private toNativeHeaders(headers: HttpHeaders): Record<string, string> {
        return headers.keys().reduce<Record<string, string>>((result, key) => {
            result[key] = headers.getAll(key)?.join(', ') ?? '';
            return result;
        }, {});
    }

    private toAngularBody(response: NativeHttpResponse, responseType: HttpRequest<unknown>['responseType']): unknown {
        if ((responseType === 'blob' || responseType === 'arraybuffer') && typeof response.data === 'string') {
            const bytes = Uint8Array.from(atob(response.data), value => value.charCodeAt(0));
            if (responseType === 'arraybuffer')
                return bytes.buffer;
            const contentType = response.headers['Content-Type'] ?? response.headers['content-type'] ?? '';
            return new Blob([bytes], { type: contentType });
        }
        return response.data;
    }

    private toError(response: NativeHttpResponse, fallbackUrl: string): HttpErrorResponse {
        return new HttpErrorResponse({
            error: response.data,
            headers: new HttpHeaders(response.headers),
            status: response.status,
            statusText: 'Native HTTP error',
            url: response.url || fallbackUrl
        });
    }
}
