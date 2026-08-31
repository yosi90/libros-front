import { BooksComponent } from './books.component';

describe('BooksComponent reader opening', () => {
    const book = {
        Id: 11,
        Nombre: 'Ala de dragón',
        Portada: '/ala-de-dragon.jpg'
    } as any;

    function create(supported: boolean) {
        const component = Object.create(BooksComponent.prototype) as any;
        component.loader = jasmine.createSpyObj('loader', ['activateLoader', 'deactivateLoader']);
        component.nativeReader = {
            supported,
            open: jasmine.createSpy('open').and.resolveTo(true)
        };
        component.router = jasmine.createSpyObj('router', ['navigate']);
        return component;
    }

    it('starts the Android reader synchronously without waiting for an animation frame', async () => {
        const component = create(true);
        const frame = spyOn(window, 'requestAnimationFrame');

        component.openBook(book);

        expect(component.nativeReader.open).toHaveBeenCalledWith(11, 'statistics', {
            bookName: 'Ala de dragón', coverUrl: '/ala-de-dragon.jpg'
        });
        expect(frame).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(component.loader.deactivateLoader).toHaveBeenCalled();
    });

    it('keeps the existing deferred web navigation', () => {
        const component = create(false);
        const frame = spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
            callback(0);
            return 1;
        });

        component.openBook(book);

        expect(frame).toHaveBeenCalled();
        expect(component.router.navigate).toHaveBeenCalledWith(['/book', 11]);
        expect(component.nativeReader.open).not.toHaveBeenCalled();
    });
});
