import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, finalize, map, of, switchMap, take, tap } from 'rxjs';
import { BookService } from '../services/entities/book.service';
import { BookStoreService } from '../services/stores/book-store.service';
import { LoaderEmmitterService } from '../services/emmitters/loader.service';
import { AppToastService } from '../shared/toast/app-toast.service';
import { getProductStateMessage } from '../shared/api-error-message';
import { SessionService } from '../services/auth/session.service';
import { NativeReaderRouteReuseStrategy } from '../services/navigation/native-reader-route-reuse.strategy';

export const bookLoadGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const bookStore = inject(BookStoreService);
    const bookService = inject(BookService);
    const loader = inject(LoaderEmmitterService);
    const toasts = inject(AppToastService);
    const session = inject(SessionService);
    const nativeReaderRoutes = inject(NativeReaderRouteReuseStrategy);
    const bookId = Number(route.paramMap.get('id'));
    const anthologyId = Number(route.queryParamMap?.get('anthologyId'));

    if (!Number.isInteger(bookId) || bookId < 1) {
        toasts.showError('El libro solicitado no es válido.', { title: 'No se pudo abrir el libro', dedupeKey: 'book:open:invalid' });
        return router.createUrlTree(['/dashboard', 'books']);
    }

    return session.sessionInitializedSubject.pipe(
        filter(initialized => initialized),
        take(1),
        switchMap(() => {
            // authGuard decide el destino si no hay sesión. Este guard no debe
            // anticiparse con una petición sin token porque Angular los ejecuta
            // en paralelo.
            if (!session.canAccessLibrary || nativeReaderRoutes.hasStoredBook(bookId) || bookStore.getBook().Id === bookId)
                return of(true);

            loader.activateLoader('book');
            const loadBook = Number.isInteger(anthologyId) && anthologyId > 0
                ? bookService.getAnthologySection(bookId)
                : bookService.getBook(bookId);
            return loadBook.pipe(
                tap(book => bookStore.setBook(book)),
                map(() => true),
                catchError(error => {
                    const cause = getProductStateMessage(error, 'La API no ha permitido cargar este libro.');
                    toasts.showError(`No se pudo abrir el libro. ${cause}`, { title: 'No se pudo abrir el libro', dedupeKey: `book:open:${bookId}:error`, durationMs: 6000 });
                    return of(router.createUrlTree(['/dashboard', 'books']));
                }),
                finalize(() => loader.deactivateLoader())
            );
        })
    );
};
