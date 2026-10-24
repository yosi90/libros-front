import { ApplicationConfig, ErrorHandler, inject, isDevMode, LOCALE_ID, provideAppInitializer } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpBackend, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { ErrorInterceptorService } from './services/auth/error-interceptor.service';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { PlatformSessionService } from './services/auth/platform-session.service';
import { PlatformTokenInterceptor } from './services/auth/platform-token.interceptor';
import { AccountScopeService } from './services/auth/account-scope.service';
import { environment } from '../environment/environment';
import { shouldEnableServiceWorker } from './services/ui/pwa-registration';
import { NativeReaderRouteReuseStrategy } from './services/navigation/native-reader-route-reuse.strategy';
import { detectNativeMobile } from './services/ui/presentation-mode.service';
import { NativeNetworkFeedbackService } from './services/native/native-network-feedback.service';
import { NativeApiHttpBackend } from './services/native/native-api-http-backend';
import { WebThemeService } from './services/ui/web-theme.service';
import { ChunkLoadRecoveryErrorHandler } from './services/ui/chunk-load-recovery';
import { ReadingReturnService } from './services/navigation/reading-return.service';
import { ClubInvitationLinkService } from './services/platform/club-invitation-link.service';

// Fechas y números se formatean en español en toda la interfaz.
registerLocaleData(localeEs);

/**
 * La sesión es la de la cuenta de Yosiftware: se arranca la limpieza por cuenta antes que el SDK, para que ningún
 * cambio de identidad llegue sin quien vacíe los datos de la anterior (CAMBIO_DE_CUENTA.md). Los enlaces de las
 * invitaciones a clubes (`#yosi-invitacion=` y `#yosi-invitaciones`) se leen y se quitan de la dirección antes de la
 * primera navegación (ESPACIOS.md, «Con tu propia interfaz»).
 */
export function startApplicationSession(
    accountScope: Pick<AccountScopeService, 'start'>,
    session: Pick<PlatformSessionService, 'start'>,
    invitationLinks?: Pick<ClubInvitationLinkService, 'start'>
): void {
    accountScope.start();
    invitationLinks?.start();
    session.start();
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
            inject(NativeNetworkFeedbackService).initialize();
            // Aplica el tema del dispositivo antes de la primera vista (sin efecto en la APK o sin flag).
            inject(WebThemeService);
            // Recuerda el libro al salir al panel (ventana «Estabas leyendo» en la Web).
            inject(ReadingReturnService);
            startApplicationSession(inject(AccountScopeService), inject(PlatformSessionService), inject(ClubInvitationLinkService));
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
        // El de errores va por fuera: solo ve lo que ya ha pasado el filtro de generación y el reintento tras 401.
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptorService, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: PlatformTokenInterceptor, multi: true }
    ]
};
