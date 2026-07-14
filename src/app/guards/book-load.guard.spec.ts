import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router, UrlTree } from '@angular/router';
import { throwError } from 'rxjs';
import { bookLoadGuard } from './book-load.guard';
import { BookService } from '../services/entities/book.service';
import { BookStoreService } from '../services/stores/book-store.service';
import { LoaderEmmitterService } from '../services/emmitters/loader.service';
import { AppToastService } from '../shared/toast/app-toast.service';

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

        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
                { provide: BookService, useValue: bookService },
                { provide: BookStoreService, useValue: bookStore },
                { provide: LoaderEmmitterService, useValue: loader },
                { provide: AppToastService, useValue: toasts }
            ]
        });

        const result = TestBed.runInInjectionContext(() => bookLoadGuard({ paramMap: convertToParamMap({ id: '42' }) } as any, {} as any));
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
    });
});
