import { ApplicationConfig, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { JwtInterceptorService } from './services/auth/jwt-interceptor.service';
import { ErrorInterceptorService } from './services/auth/error-interceptor.service';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RuntimeConfigService } from './services/realtime/runtime-config.service';
import { provideServiceWorker } from '@angular/service-worker';
import { SessionService } from './services/auth/session.service';
import { environment } from '../environment/environment';
import { shouldEnableServiceWorker } from './services/ui/pwa-registration';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideAppInitializer(async () => {
            const runtimeConfig = inject(RuntimeConfigService);
            const session = inject(SessionService);
            await runtimeConfig.load();
            await session.initialize();
        }),
        provideAnimationsAsync(),
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
