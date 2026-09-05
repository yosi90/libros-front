import { HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable, InjectionToken, inject } from '@angular/core';
import { CapacitorHttp } from '@capacitor/core';
import type { CapacitorHttpPlugin, HttpResponse } from '@capacitor/core/types/core-plugins';
import { environment } from '../../../environment/environment';
import { AuthenticatedSession, CsrfTokenResponse, FirebaseSessionRequest, FirebaseSessionResult } from '../../interfaces/auth';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

export const NATIVE_HTTP = new InjectionToken<CapacitorHttpPlugin>('NATIVE_HTTP', {
    providedIn: 'root',
    factory: () => inject(NATIVE_MOBILE_PLATFORM)
        ? CapacitorHttp
        : {} as CapacitorHttpPlugin
});

@Injectable({ providedIn: 'root' })
export class NativeSessionTransportAdapter {
    private readonly authUrl = `${environment.apiUrl}auth`;

    constructor(
        @Inject(NATIVE_HTTP) private http: CapacitorHttpPlugin,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    async exchange(request: FirebaseSessionRequest): Promise<FirebaseSessionResult> {
        return this.body(await this.post(`${this.authUrl}/session`, request));
    }

    async restoreCsrf(): Promise<CsrfTokenResponse> {
        return this.body(await this.request('GET', `${this.authUrl}/session/csrf`));
    }

    async refresh(csrfToken: string): Promise<AuthenticatedSession> {
        return this.body(await this.post(`${this.authUrl}/session/refresh`, {}, {
            'X-CSRF-Token': csrfToken
        }));
    }

    async logout(csrfToken: string): Promise<void> {
        await this.request('DELETE', `${this.authUrl}/session`, undefined, {
            'X-CSRF-Token': csrfToken
        });
    }

    private post(url: string, data: unknown, headers: Record<string, string> = {}): Promise<HttpResponse> {
        return this.request('POST', url, data, headers);
    }

    private async request(method: string, url: string, data?: unknown, headers: Record<string, string> = {}): Promise<HttpResponse> {
        if (!this.nativeMobile)
            throw new Error('El transporte de sesión nativo solo está disponible dentro de Android.');

        const response = await this.http.request({
            method,
            url,
            data,
            headers: { 'Content-Type': 'application/json', ...headers },
            responseType: 'json',
            connectTimeout: 15_000,
            readTimeout: 30_000
        });
        if (response.status < 200 || response.status >= 300)
            throw new HttpErrorResponse({
                error: response.data,
                status: response.status,
                statusText: 'Native HTTP error',
                url: response.url || url
            });
        return response;
    }

    private body<T>(response: HttpResponse): T {
        return response.data as T;
    }
}
