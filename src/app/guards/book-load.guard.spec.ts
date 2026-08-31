import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router, UrlTree } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable, throwError } from 'rxjs';
import { bookLoadGuard } from './book-load.guard';
import { BookService } from '../services/entities/book.service';
import { BookStoreService } from '../services/stores/book-store.service';
import { LoaderEmmitterService } from '../services/emmitters/loader.service';
import { AppToastService } from '../shared/toast/app-toast.service';
import { SessionService } from '../services/auth/session.service';
import { NativeReaderRouteReuseStrategy } from '../services/navigation/native-reader-route-reuse.strategy';

describe('bookLoadGuard', () => {
    it('returns to the collection instead of activating an empty book shell when loading fails', done => {
        const redirect = {} as UrlTree;
        const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
        router.createUrlTree.and.returnValue(redirect);
        const bookService = jasmine.createSpyObj<BookService>('BookService', ['getBook']);
        bookService.getBook.and.returnValue(throwError(() => ({ status: 0 })));
        const bookStore = jasmine.createSpyObj<BookStoreService>('BookStoreService', ['getBook', 'setBook']);
        bookStore.getBook.and.returnValue({ Id: 0 } as any);
        const loader = jasmine.createSpyObj<LoaderEmmitterService>('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        const toasts = jasmine.createSpyObj<AppToastService>('AppToastService', ['showError']);
        const initialized = new BehaviorSubject(false);
        const session = { sessionInitializedSubject: initialized, canAccessLibrary: true };
        const nativeReaderRoutes = jasmine.createSpyObj<NativeReaderRouteReuseStrategy>('NativeReaderRouteReuseStrategy', ['hasStoredBook']);
        nativeReaderRoutes.hasStoredBook.and.returnValue(false);

        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
                { provide: BookService, useValue: bookService },
                { provide: BookStoreService, useValue: bookStore },
                { provide: LoaderEmmitterService, useValue: loader },
                { provide: AppToastService, useValue: toasts },
                { provide: SessionService, useValue: session },
                { provide: NativeReaderRouteReuseStrategy, useValue: nativeReaderRoutes }
            ]
        });

        const result = TestBed.runInInjectionContext(() => bookLoadGuard({ paramMap: convertToParamMap({ id: '42' }) } as any, {} as any));
        expect(bookService.getBook).not.toHaveBeenCalled();
        (result as any).subscribe({
            next: (outcome: unknown) => {
                expect(outcome).toBe(redirect);
                expect(toasts.showError).toHaveBeenCalled();
            },
            complete: () => {
                setTimeout(() => {
                    expect(loader.deactivateLoader).toHaveBeenCalled();
                    done();
                });
            }
        });
        initialized.next(true);
    });

    it('does not reload a book whose detached native route is still in memory', async () => {
        const bookService = jasmine.createSpyObj<BookService>('BookService', ['getBook']);
        const bookStore = jasmine.createSpyObj<BookStoreService>('BookStoreService', ['getBook', 'setBook']);
        bookStore.getBook.and.returnValue({ Id: 0 } as any);
        const nativeReaderRoutes = jasmine.createSpyObj<NativeReaderRouteReuseStrategy>('NativeReaderRouteReuseStrategy', ['hasStoredBook']);
        nativeReaderRoutes.hasStoredBook.and.returnValue(true);
        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['createUrlTree']) },
                { provide: BookService, useValue: bookService },
                { provide: BookStoreService, useValue: bookStore },
                { provide: LoaderEmmitterService, useValue: jasmine.createSpyObj<LoaderEmmitterService>('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']) },
                { provide: AppToastService, useValue: jasmine.createSpyObj<AppToastService>('AppToastService', ['showError']) },
                { provide: SessionService, useValue: { sessionInitializedSubject: new BehaviorSubject(true), canAccessLibrary: true } },
                { provide: NativeReaderRouteReuseStrategy, useValue: nativeReaderRoutes }
            ]
        });

        const result = TestBed.runInInjectionContext(() => bookLoadGuard({ paramMap: convertToParamMap({ id: '42' }) } as any, {} as any));

        expect(await firstValueFrom(result as Observable<boolean>)).toBeTrue();
        expect(nativeReaderRoutes.hasStoredBook).toHaveBeenCalledWith(42);
        expect(bookService.getBook).not.toHaveBeenCalled();
    });
});
