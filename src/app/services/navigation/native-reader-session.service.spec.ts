import { NavigationEnd } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { NativeReaderSessionService } from './native-reader-session.service';

describe('NativeReaderSessionService', () => {
    beforeEach(() => localStorage.clear());

    function create() {
        const events = new Subject<any>();
        const router = {
            url: '/dashboard/books', events,
            navigate: jasmine.createSpy('navigate').and.resolveTo(true),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.callFake(async (url: string) => {
                router.url = url;
                events.next(new NavigationEnd(1, url, url));
                return true;
            })
        };
        const logged$ = new BehaviorSubject(false);
        const session = { userIsLogged$: logged$, userId: 7, canAccessLibrary: true };
        const book = { Id: 11, Nombre: 'Libro activo', Portada: '/cover.jpg' };
        const books = { getBook: jasmine.createSpy('getBook').and.returnValue(book), setBook: jasmine.createSpy('setBook') };
        const bookApi = { getBook: jasmine.createSpy('apiGetBook').and.returnValue(of(book)) };
        const reuse = jasmine.createSpyObj('reuse', ['preserveDashboardOnNextNavigation', 'preserveBookOnNextNavigation', 'cancelPendingPreservation', 'discardBook', 'clear']);
        const toasts = jasmine.createSpyObj('toasts', ['showInfo']);
        const service = new NativeReaderSessionService(router as any, session as any, books as any, bookApi as any, reuse, toasts, true);
        return { service, router, session, logged$, books, bookApi, reuse };
    }

    it('opens, minimizes, restores and closes one native reader session', async () => {
        const { service, router, reuse } = create();

        expect(await service.open(11)).toBeTrue();
        expect(service.state()).toEqual(jasmine.objectContaining({ mode: 'expanded', bookId: 11, backgroundUrl: '/dashboard/books' }));
        expect(reuse.preserveDashboardOnNextNavigation).toHaveBeenCalled();

        expect(await service.minimize()).toBeTrue();
        expect(service.state().mode).toBe('minimized');
        expect(reuse.preserveBookOnNextNavigation).toHaveBeenCalled();

        expect(await service.restore()).toBeTrue();
        expect(service.state().mode).toBe('expanded');
        expect(router.url).toBe('/book/11/statistics');

        expect(await service.close()).toBeTrue();
        expect(service.state().mode).toBe('closed');
    });

    it('restores only metadata for the same authenticated actor', async () => {
        localStorage.setItem('book-front:native-reader:v1:7', JSON.stringify({ version: 1, actorId: 7, bookId: 11, readerUrl: '/book/11/chapter/4', updatedAt: 1 }));
        const { service, logged$, bookApi, books } = create();
        logged$.next(true);
        await Promise.resolve();

        expect(bookApi.getBook).toHaveBeenCalledWith(11);
        expect(books.setBook).toHaveBeenCalled();
        expect(service.state()).toEqual(jasmine.objectContaining({ mode: 'minimized', readerUrl: '/book/11/chapter/4' }));
    });

    it('uses its own book history before minimizing on native back', async () => {
        const { service, router } = create();
        await service.open(11);
        router.url = '/book/11/chapter/4';
        router.events.next(new NavigationEnd(2, router.url, router.url));

        expect(service.handleNativeBack()).toBeTrue();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/book/11/statistics', { replaceUrl: true });
    });

    it('keeps the expanded reader when its save guard cancels minimization', async () => {
        const { service, router, reuse } = create();
        await service.open(11);
        router.navigateByUrl.and.resolveTo(false);

        expect(await service.minimize()).toBeFalse();
        expect(service.state()).toEqual(jasmine.objectContaining({ mode: 'expanded', transition: 'idle', saving: false }));
        expect(reuse.cancelPendingPreservation).toHaveBeenCalled();
    });

    it('closes the current book before replacing it with another one', async () => {
        const { service, router, reuse } = create();
        await service.open(11);

        expect(await service.open(12, 'chapter/3')).toBeTrue();
        expect(router.navigateByUrl.calls.allArgs().map(args => args[0])).toEqual([
            '/book/11/statistics', '/dashboard/books', '/book/12/chapter/3'
        ]);
        expect(reuse.discardBook).toHaveBeenCalled();
        expect(service.state()).toEqual(jasmine.objectContaining({ mode: 'expanded', bookId: 12 }));
    });

    it('clears the persisted reader and both cached trees on logout', async () => {
        const { service, logged$, reuse } = create();
        logged$.next(true);
        await service.open(11);
        expect(localStorage.getItem('book-front:native-reader:v1:7')).not.toBeNull();

        logged$.next(false);

        expect(localStorage.getItem('book-front:native-reader:v1:7')).toBeNull();
        expect(reuse.clear).toHaveBeenCalled();
        expect(service.state().mode).toBe('closed');
    });
});
