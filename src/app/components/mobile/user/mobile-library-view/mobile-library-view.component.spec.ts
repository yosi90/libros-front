import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { MobileLibraryViewComponent } from './mobile-library-view.component';

describe('MobileLibraryViewComponent', () => {
    it('uses the shared library expansion state and allows both levels to toggle', () => {
        const component = new MobileLibraryViewComponent();
        const expandedUniverses = new Set([10]);
        const expandedSagas = new Set([20]);
        component.controller = {
            isUniverseExpanded: (universe: Universe) => expandedUniverses.has(universe.Id),
            isSagaExpanded: (saga: Saga) => expandedSagas.has(saga.Id),
            markUniverseExpanded: (id: number) => expandedUniverses.add(id),
            markUniverseCollapsed: (id: number) => expandedUniverses.delete(id),
            markSagaExpanded: (id: number) => expandedSagas.add(id),
            markSagaCollapsed: (id: number) => expandedSagas.delete(id)
        } as unknown as MobileLibraryViewComponent['controller'];
        const universe = createUniverse(createSaga(20, []), []);
        const saga = universe.Sagas[0];

        expect(component.isUniverseExpanded(universe)).toBeTrue();
        expect(component.isSagaExpanded(saga)).toBeTrue();

        component.toggleUniverse(universe);
        component.toggleSaga(saga);
        expect(component.isUniverseExpanded(universe)).toBeFalse();
        expect(component.isSagaExpanded(saga)).toBeFalse();

        component.toggleUniverse(universe);
        component.toggleSaga(saga);
        expect(component.isUniverseExpanded(universe)).toBeTrue();
        expect(component.isSagaExpanded(saga)).toBeTrue();
    });

    it('groups saga items separately from standalone items and orders them by saga order', () => {
        const component = new MobileLibraryViewComponent();
        const saga = createSaga(20, [createBook(2, 'Segundo', 2), createBook(1, 'Primero', 1)]);
        const universe = createUniverse(saga, [createBook(3, 'Independiente', -1)]);

        expect(component.sagasForUniverse(universe)).toEqual([saga]);
        expect(component.sagaItems(saga).map(entry => entry.item.Nombre)).toEqual(['Primero', 'Segundo']);
        expect(component.standaloneItems(universe).map(entry => entry.item.Nombre)).toEqual(['Independiente']);
    });

    it('omits empty sagas from the mobile hierarchy', () => {
        const component = new MobileLibraryViewComponent();
        const emptySaga = createSaga(30, []);

        expect(component.sagasForUniverse(createUniverse(emptySaga, []))).toEqual([]);
    });

    it('uses the singular title label for one item', () => {
        const component = new MobileLibraryViewComponent();

        expect(component.itemCountLabel(1)).toBe('1 título');
        expect(component.itemCountLabel(2)).toBe('2 títulos');
    });

    it('derives a stable golden-angle hue from the universe id and keeps the empty universe neutral', () => {
        const component = new MobileLibraryViewComponent();
        const universe = createUniverse(createSaga(20, []), []);

        expect(component.universeHue(universe)).toBe('295.080');
        expect(component.universeHue({ ...universe })).toBe('295.080');
        expect(component.universeHue({ ...universe, Id: 1, Nombre: 'Sin universo' })).toBeNull();
    });

    it('shows canonical universe authors except for Sin universo', () => {
        const component = new MobileLibraryViewComponent();
        component.controller = { getAuthors: (authors: BookSimple['Autores']) => authors.map(author => author.Nombre) } as unknown as MobileLibraryViewComponent['controller'];
        const universe = { ...createUniverse(createSaga(20, []), []), Autores: [{ Id: 1, Nombre: 'Brandon Sanderson' }] };

        expect(component.universeAuthors(universe)).toBe('Brandon Sanderson');
        expect(component.universeAuthors({ ...universe, Id: 1, Nombre: 'Sin universo' })).toBe('');
    });
});

function createUniverse(saga: Saga, books: BookSimple[]): Universe {
    return { Id: 10, Nombre: 'Cosmere', Autores: [], Sagas: [saga], Libros: books, Antologias: [] };
}

function createSaga(id: number, books: BookSimple[], antologies: Antology[] = []): Saga {
    return { Id: id, Nombre: 'Nacidos de la bruma', Autores: [], Libros: books, Antologias: antologies };
}

function createBook(id: number, name: string, order: number): BookSimple {
    return { Id: id, Nombre: name, Orden: order, Estados: [], Autores: [], Portada: '' };
}
