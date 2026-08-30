import { ApplicationConfig, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { JwtInterceptorService } from './services/auth/jwt-interceptor.service';
import { ErrorInterceptorService } from './services/auth/error-interceptor.service';
import { routes } from './app.routes';
import { RuntimeConfigService } from './services/realtime/runtime-config.service';
import { provideServiceWorker } from '@angular/service-worker';
import { SessionService } from './services/auth/session.service';
import { environment } from '../environment/environment';
import { shouldEnableServiceWorker } from './services/ui/pwa-registration';

export function startApplicationRestoration(
    runtimeConfig: RuntimeConfigService,
    session: SessionService
): void {
    // La restauración puede tardar mientras Android descarta conexiones de una
    // red anterior. Los guards ya esperan sessionInitializedSubject, por lo que
    // no hace falta bloquear la creación del shell y dejar el WebView en negro.
    void runtimeConfig.load()
        .catch(() => undefined)
        .then(() => session.initialize());
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideAppInitializer(() => {
            const runtimeConfig = inject(RuntimeConfigService);
            const session = inject(SessionService);
            startApplicationRestoration(runtimeConfig, session);
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: shouldEnableServiceWorker(
                isDevMode(),
                environment.environmentName,
                typeof location === 'undefined' ? '' : location.hostname
            ),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptorService, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptorService, multi: true }
    ]
};
