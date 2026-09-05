import { BooksComponent } from './books.component';
import { of } from 'rxjs';

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
        component.presentation = { snapshot: { isMobilePresentationActive: true } };
        component.openingAnthologySectionId = null;
        return component;
    }

    it('opens the Android reader on the next animation frame like the known-good 1.0.11 flow', async () => {
        const component = create(true);
        let callback: FrameRequestCallback | undefined;
        const frame = spyOn(window, 'requestAnimationFrame').and.callFake(value => {
            callback = value;
            return 1;
        });

        component.openBook(book);

        expect(frame).toHaveBeenCalled();
        expect(component.nativeReader.open).not.toHaveBeenCalled();
        callback?.(0);
        expect(component.nativeReader.open).toHaveBeenCalledWith(11, 'statistics', {
            bookName: 'Ala de dragón', coverUrl: '/ala-de-dragon.jpg'
        });
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

    it('expands only universes and sagas that contain a running book', () => {
        const component = create(false);
        const running = { Id: 1, Estados: [{ Nombre: 'En marcha' }] } as any;
        const waiting = { Id: 2, Estados: [{ Nombre: 'En espera' }] } as any;
        component.visibleUniverses = [
            { Id: 10, Libros: [waiting], Sagas: [], Antologias: [] },
            { Id: 20, Libros: [running], Sagas: [], Antologias: [] },
            { Id: 30, Libros: [], Sagas: [{ Id: 31, Libros: [running], Antologias: [] }], Antologias: [] }
        ];

        component.expandRunningBookPanels();

        expect([...component.expandedUniverseIds]).toEqual([20, 30]);
        expect([...component.expandedSagaIds]).toEqual([31]);
    });

    it('opens an anthology selector and orders its contextual sections', () => {
        const component = create(true);
        const anthology = { Id: 4, Nombre: 'Arcanum ilimitado', Autores: [], Portada: '/anthology.jpg' } as any;
        component.universeStore = { getAllAnthologies: () => [anthology] };
        component.anthologyApi = { getAntology: () => of({
            ...anthology,
            Libros: [
                { Id: 32, Nombre: 'Segunda', Orden: 2, Autores: [], Estados: [], Portada: '/2.jpg' },
                { Id: 31, Nombre: 'Primera', Orden: 1, Autores: [], Estados: [], Portada: '/1.jpg' }
            ]
        }) };

        component.openAntology(4);

        expect(component.selectedAnthology.Id).toBe(4);
        expect(component.anthologySections.map((section: any) => section.Id)).toEqual([31, 32]);
        expect(component.isLoadingAnthology).toBeFalse();
    });

    it('opens a selected section in the native reader with its anthology context', async () => {
        const component = create(true);
        const section = { Id: 31, Nombre: 'El Alma del Emperador', Portada: '/section.jpg' } as any;
        component.selectedAnthology = { Id: 4, Nombre: 'Arcanum ilimitado' };
        component.anthologySections = [section];
        component.bookApi = { getAnthologySection: () => of(section) };
        component.bookStore = jasmine.createSpyObj('bookStore', ['setBook']);
        let callback: FrameRequestCallback | undefined;
        spyOn(window, 'requestAnimationFrame').and.callFake(value => { callback = value; return 1; });

        component.openAnthologySection(section);
        callback?.(0);
        await Promise.resolve();
        await Promise.resolve();

        expect(component.bookStore.setBook).toHaveBeenCalledWith(section);
        expect(component.nativeReader.open).toHaveBeenCalledWith(31, 'statistics', {
            bookName: section.Nombre, coverUrl: section.Portada, anthologyId: 4
        });
        expect(component.selectedAnthology).toBeNull();
    });
});
