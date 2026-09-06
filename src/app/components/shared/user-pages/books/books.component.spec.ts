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
        component.fullscreenReturn = jasmine.createSpyObj('fullscreenReturn', ['rememberAnthology', 'consumeAnthology']);
        component.fullscreenReturn.consumeAnthology.and.returnValue(null);
        component.presentation = { snapshot: { isMobilePresentationActive: true } };
        component.openingAnthologySectionId = null;
        component.anthologySectionContextLoadingId = null;
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

    it('opens similar anthologies with the first canonical style selected', () => {
        const component = create(true);
        component.selectedAnthology = {
            Id: 4, Nombre: 'Arcanum ilimitado', Autores: [], Estados: [], Portada: '/anthology.jpg',
            Estilos: [{ Id: 130, Nombre: 'Fantasía' }, { Id: 144, Nombre: 'Ficción especulativa' }]
        };
        component.anthologySections = [];
        component.catalogViewState = jasmine.createSpyObj('catalogViewState', ['update', 'setScrollTop']);

        component.findSimilarAnthologies();

        expect(component.fullscreenReturn.rememberAnthology).toHaveBeenCalledOnceWith(4);
        expect(component.catalogViewState.update).toHaveBeenCalledWith(jasmine.objectContaining({
            filterType: 'antologia', selectedStyleFilter: 130, searchTerms: []
        }));
        expect(component.catalogViewState.setScrollTop).toHaveBeenCalledOnceWith(0);
        expect(component.router.navigate).toHaveBeenCalledWith(['/dashboard/catalog']);
        expect(component.selectedAnthology).toBeNull();
    });

    it('hands the selected anthology to the catalog public detail', () => {
        const component = create(true);
        component.selectedAnthology = { Id: 4, Nombre: 'Arcanum ilimitado', Autores: [], Estados: [], Portada: '/anthology.jpg' };
        component.anthologySections = [];
        component.catalogViewState = jasmine.createSpyObj('catalogViewState', ['setPendingDetail']);

        component.openAnthologyDetails();

        expect(component.fullscreenReturn.rememberAnthology).toHaveBeenCalledOnceWith(4, true);
        expect(component.catalogViewState.setPendingDetail).toHaveBeenCalledWith(jasmine.objectContaining({ Id: 4, Tipo: 'antologia' }));
        expect(component.router.navigate).toHaveBeenCalledWith(['/dashboard/catalog']);
    });

    it('keeps the anthology selector behind its reading editor', () => {
        const component = create(true);
        const anthology = { Id: 4, Nombre: 'Arcanum ilimitado', Estados: [], Autores: [] } as any;
        component.selectedAnthology = anthology;
        component.anthologySections = [{ Id: 31, Nombre: 'El Alma del Emperador' }];
        component.openCollectionModal = jasmine.createSpy('openCollectionModal');

        component.editSelectedAnthology();

        expect(component.openCollectionModal).toHaveBeenCalledWith('antology', anthology);
        expect(component.selectedAnthology).toBe(anthology);
        expect(component.anthologySections.length).toBe(1);
    });

    it('loads the private contextual state before opening the section editor', () => {
        const component = create(true);
        const section = { Id: 31, Nombre: 'El Alma del Emperador' } as any;
        component.selectedAnthology = { Id: 4, Nombre: 'Arcanum ilimitado' };
        component.collectionSrv = { getAnthologySectionContext: () => of({
            AntologiaId: 4, LibroId: 31,
            EstadoActual: { Id: 8, EstadoId: 1, Fecha: '2026-09-06' }, Estados: [],
            Puntuacion: 4, Resena: 'Muy buena.', FechaActualizacion: null
        }) };
        const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);

        component.requestAnthologySectionManagement(section, event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.selectedAnthologySection).toEqual({ anthologyId: 4, section });
        expect(component.selectedSectionStatus).toBe(1);
        expect(component.selectedSectionRating).toBe(4);
        expect(component.selectedSectionReview).toBe('Muy buena.');
        expect(component.anthologySectionContextLoadingId).toBeNull();
    });

    it('writes section changes contextually and reconciles the anthology detail', () => {
        const component = create(true);
        const section = { Id: 31, Nombre: 'El Alma del Emperador', Portada: '', Estados: [] } as any;
        component.selectedAnthology = { Id: 4, Nombre: 'Arcanum ilimitado', SeccionesProgreso: [] };
        component.anthologySections = [section];
        component.selectedAnthologySection = { anthologyId: 4, section };
        component.selectedSectionStatus = 2;
        component.selectedSectionOriginalStatus = 1;
        component.selectedSectionRating = 5;
        component.selectedSectionOriginalRating = 4;
        component.selectedSectionReview = 'Excelente.';
        component.selectedSectionOriginalReview = 'Muy buena.';
        component.isSavingCollection = false;
        component.collectionSrv = jasmine.createSpyObj('collectionSrv', ['updateAnthologySectionContext']);
        component.collectionSrv.updateAnthologySectionContext.and.returnValue(of({ success: true, Seccion: {} }));
        component.anthologyApi = { getAntology: () => of({ Id: 4, Nombre: 'Arcanum ilimitado', Libros: [section] }) };
        component.snackBar = jasmine.createSpyObj('snackBar', ['openSnackBar']);

        component.saveAnthologySectionState();

        expect(component.collectionSrv.updateAnthologySectionContext).toHaveBeenCalledWith(4, 31, {
            EstadoId: 2, Puntuacion: 5, Resena: 'Excelente.'
        });
        expect(component.selectedAnthologySection).toBeNull();
        expect(component.snackBar.openSnackBar).toHaveBeenCalledWith('Sección actualizada', 'successBar');
    });
});
