import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { BookTitleService } from '../../../../services/entities/book-title.service';
import { PlatformAiService } from '../../../../services/platform/platform-ai.service';
import { BookTitleFullscreenService } from './book-title-fullscreen.service';

/** Dobles mudos de lo que usa `BookTitleState`, para las pruebas que construyen sus fachadas a mano. */
export function bookTitleTestingProviders(): Provider[] {
    return [
        { provide: BookTitleService, useValue: { get: () => EMPTY, save: () => EMPTY, generate: () => EMPTY } },
        { provide: PlatformAiService, useValue: { status: () => EMPTY, models: () => EMPTY } },
        { provide: BookTitleFullscreenService, useValue: { open: () => EMPTY, close: () => undefined } },
        { provide: SnackbarModule, useValue: { openApiError: () => undefined, openSnackBar: () => undefined } },
        { provide: PlatformSessionService, useValue: { socialUrl: () => 'https://social.yosiftware.es/?vista=claves-ia' } }
    ];
}

/** Construye una fachada con `BookTitleState` (que usa `inject()`) fuera de un componente de TestBed. */
export function withBookTitleContext<T>(create: () => T): T {
    try {
        TestBed.configureTestingModule({ providers: bookTitleTestingProviders() });
    } catch {
        // Segunda fachada de la misma prueba: el módulo ya está montado con los dobles.
    }
    return TestBed.runInInjectionContext(create);
}
