import { ApplicationConfig, ErrorHandler, inject, isDevMode, LOCALE_ID, provideAppInitializer } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpBackend, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { JwtInterceptorService } from './services/auth/jwt-interceptor.service';
import { ErrorInterceptorService } from './services/auth/error-interceptor.service';
import { routes } from './app.routes';
import { RuntimeConfigService } from './services/realtime/runtime-config.service';
import { provideServiceWorker } from '@angular/service-worker';
import { SessionService } from './services/auth/session.service';
import { environment } from '../environment/environment';
import { shouldEnableServiceWorker } from './services/ui/pwa-registration';
import { NativeReaderRouteReuseStrategy } from './services/navigation/native-reader-route-reuse.strategy';
import { detectNativeMobile } from './services/ui/presentation-mode.service';
import { NativeNetworkFeedbackService } from './services/native/native-network-feedback.service';
import { NativeApiHttpBackend } from './services/native/native-api-http-backend';
import { WebThemeService } from './services/ui/web-theme.service';
import { WebRouteSupportService } from './services/ui/web-route-support.service';
import { ChunkLoadRecoveryErrorHandler } from './services/ui/chunk-load-recovery';

// Fechas y números se formatean en español en toda la interfaz.
registerLocaleData(localeEs);

export function startApplicationRestoration(
    runtimeConfig: RuntimeConfigService,
    session: SessionService
): void {
    // La configuración de Firebase/realtime no es un requisito para renovar la
    // cookie HTTP. Esperarla duplicaba los timeouts y podía dejar el router sin
    // destino visible antes siquiera de empezar a recuperar la sesión.
    void runtimeConfig.load().catch(() => undefined);
    void session.initialize();
}

export const appConfig: ApplicationConfig = {
    providers: [
        { provide: LOCALE_ID, useValue: 'es-ES' },
        // Una pestaña abierta antes de una publicación recarga para traer la versión nueva.
        { provide: ErrorHandler, useClass: ChunkLoadRecoveryErrorHandler },
        provideRouter(routes),
        NativeReaderRouteReuseStrategy,
        { provide: RouteReuseStrategy, useExisting: NativeReaderRouteReuseStrategy },
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        { provide: HttpBackend, useClass: NativeApiHttpBackend },
        provideAppInitializer(() => {
            const runtimeConfig = inject(RuntimeConfigService);
            const session = inject(SessionService);
            inject(NativeNetworkFeedbackService).initialize();
            // Aplica el tema del dispositivo antes de la primera vista (sin efecto en la APK o sin flag).
            inject(WebThemeService);
            inject(WebRouteSupportService);
            startApplicationRestoration(runtimeConfig, session);
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: shouldEnableServiceWorker(
                isDevMode(),
                environment.environmentName,
                typeof location === 'undefined' ? '' : location.hostname,
                detectNativeMobile()
            ),
            registrationStrategy: detectNativeMobile() ? 'registerImmediately' : 'registerWhenStable:30000'
        }),
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptorService, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptorService, multi: true }
    ]
};
