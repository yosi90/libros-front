import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { BookService } from '../services/entities/book.service';
import { BookStoreService } from '../services/stores/book-store.service';
import { LoaderEmmitterService } from '../services/emmitters/loader.service';
import { AppToastService } from '../shared/toast/app-toast.service';
import { getProductStateMessage } from '../shared/api-error-message';

export const bookLoadGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const bookStore = inject(BookStoreService);
    const bookService = inject(BookService);
    const loader = inject(LoaderEmmitterService);
    const toasts = inject(AppToastService);
    const bookId = Number(route.paramMap.get('id'));

    if (!Number.isInteger(bookId) || bookId < 1) {
        toasts.showError('El libro solicitado no es válido.');
        return router.createUrlTree(['/dashboard', 'books']);
    }

    if (bookStore.getBook().Id === bookId)
        return true;

    loader.activateLoader('book');
    return bookService.getBook(bookId).pipe(
        tap(book => bookStore.setBook(book)),
        map(() => true),
        catchError(error => {
            const cause = getProductStateMessage(error, 'La API no ha permitido cargar este libro.');
            toasts.showError(`No se pudo abrir el libro. ${cause}`, { durationMs: 6000 });
            return of(router.createUrlTree(['/dashboard', 'books']));
        }),
        finalize(() => loader.deactivateLoader())
    );
};
