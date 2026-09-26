import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { ReadingReturnService } from './reading-return.service';
import { BookStoreService } from '../stores/book-store.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

describe('ReadingReturnService', () => {
    let events: Subject<unknown>;
    let router: { events: Subject<unknown>; navigateByUrl: jasmine.Spy };
    let service: ReadingReturnService;
    const book = {
        Id: 29, Nombre: 'Siega', Portada: 'siega.png',
        Capitulos: [{ Id: 11, Orden: 11, Nombre: 'Indiscreciones' }], Interludios: []
    };

    function navigate(url: string, id = 1): void {
        events.next(new NavigationEnd(id, url, url));
    }

    beforeEach(() => {
        sessionStorage.removeItem('libros:parked-reading');
        events = new Subject();
        router = { events, navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };
        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
                { provide: BookStoreService, useValue: { getBook: () => book } },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: false }
            ]
        });
        service = TestBed.inject(ReadingReturnService);
    });

    afterEach(() => sessionStorage.removeItem('libros:parked-reading'));

    it('remembers the chapter when leaving the book for the dashboard', () => {
        navigate('/book/29/chapter/11');
        navigate('/dashboard/catalog');

        expect(service.parked()).toEqual({ bookId: 29, url: '/book/29/chapter/11', bookName: 'Siega', cover: 'siega.png', place: 'Capítulo 11 · Indiscreciones' });
    });

    it('returns to the book and hides the window inside it', () => {
        navigate('/book/29/characters');
        navigate('/dashboard/books');
        expect(service.parked()?.place).toBe('Personajes');

        service.resume();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/book/29/characters');
        navigate('/book/29/characters');
        expect(service.parked()).toBeNull();
    });

    it('forgets the book when dismissed or when leaving the dashboard', () => {
        navigate('/book/29/statistics');
        navigate('/dashboard/books');
        service.dismiss();
        expect(service.parked()).toBeNull();

        navigate('/book/29/statistics');
        navigate('/dashboard/books');
        navigate('/login');
        expect(service.parked()).toBeNull();
    });
});
