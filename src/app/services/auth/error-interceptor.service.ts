import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { getApiErrorCode } from '../../shared/api-error-message';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { CollectionService } from '../entities/collection.service';
import { UniverseStoreService } from '../stores/universe-store.service';
import { PlatformSessionService } from './platform-session.service';
import { isLibrosApiRequest } from './platform-token.interceptor';

/**
 * Respuestas de la API de Libros que afectan a toda la web (ADHESION_YOSIFTWARE.md, «Errores de autenticación y de
 * acceso»). Los 401 ya los ha reintentado `PlatformTokenInterceptor`; aquí llegan el resto.
 */
@Injectable({ providedIn: 'root' })
export class ErrorInterceptorService implements HttpInterceptor {
    private refreshingCollection = false;

    constructor(
        private session: PlatformSessionService,
        private injector: Injector
    ) { }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || !isLibrosApiRequest(req) || isImageRequest(req))
                return throwError(() => error);

            const code = getApiErrorCode(error);
            if (error.status === 409 && code === 'anthology_section_collection_forbidden')
                this.reconcileCollection();
            if (error.status === 403 && code === 'account_deleted')
                this.session.forgetDeletedAccount();
            if (error.status === 403 && code === 'platform_rules_acceptance_required')
                this.injector.get(AppToastService).showSystem(
                    'Acepta las normas de Libros para seguir. Te las enseñamos en la ventana de Yosiftware.',
                    { title: 'Normas de Libros pendientes', dedupeKey: 'platform:rules-pending', durationMs: 8000 }
                );
            return throwError(() => error);
        }));
    }

    private reconcileCollection(): void {
        if (this.refreshingCollection || !this.session.userIsLogged) return;
        this.refreshingCollection = true;
        const generation = this.session.generation;
        queueMicrotask(() => this.injector.get(CollectionService).getUniverses().subscribe({
            next: universes => {
                if (this.session.isCurrentGeneration(generation))
                    this.injector.get(UniverseStoreService).setUniverses(universes);
            },
            error: () => { this.refreshingCollection = false; },
            complete: () => { this.refreshingCollection = false; }
        }));
    }
}

function isImageRequest(req: HttpRequest<unknown>): boolean {
    return /\.(?:jpe?g|png|gif|webp|svg)(?:\?|$)/i.test(req.url);
}
