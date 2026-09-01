import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { MobileLibraryViewComponent } from './mobile-library-view.component';

describe('MobileLibraryViewComponent', () => {
    it('keeps universes and sagas expanded by default and allows both levels to collapse', () => {
        const component = new MobileLibraryViewComponent();

        expect(component.isUniverseExpanded(10)).toBeTrue();
        expect(component.isSagaExpanded(20)).toBeTrue();

        component.toggleUniverse(10);
        component.toggleSaga(20);
        expect(component.isUniverseExpanded(10)).toBeFalse();
        expect(component.isSagaExpanded(20)).toBeFalse();

        component.toggleUniverse(10);
        component.toggleSaga(20);
        expect(component.isUniverseExpanded(10)).toBeTrue();
        expect(component.isSagaExpanded(20)).toBeTrue();
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
