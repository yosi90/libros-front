import { AnthologySection, Antology } from '../interfaces/antology';
import { BookSimple } from '../interfaces/book';
import { Saga } from '../interfaces/saga';
import { Universe } from '../interfaces/universe';

/**
 * Agrupación y etiquetas de la Biblioteca, comunes a sus vistas de presentación.
 * Funciones puras: no deciden estilos ni navegación.
 */
export type LibraryCardItem = { kind: 'book' | 'antology'; item: BookSimple | Antology };

export function sortLibraryItems(items: LibraryCardItem[]): LibraryCardItem[] {
    return items.sort((current, next) => {
        const orderDelta = Number(current.item.Orden) - Number(next.item.Orden);
        return orderDelta || current.item.Nombre.localeCompare(next.item.Nombre, 'es', { sensitivity: 'base' });
    });
}

export function universeStandaloneItems(universe: Universe): LibraryCardItem[] {
    return sortLibraryItems([
        ...(universe.Libros ?? []).map(item => ({ kind: 'book' as const, item })),
        ...(universe.Antologias ?? []).map(item => ({ kind: 'antology' as const, item }))
    ]);
}

export function sagaLibraryItems(saga: Saga): LibraryCardItem[] {
    return sortLibraryItems([
        ...(saga.Libros ?? []).map(item => ({ kind: 'book' as const, item })),
        ...(saga.Antologias ?? []).map(item => ({ kind: 'antology' as const, item }))
    ]);
}

/** Sagas del universo con algún título visible tras los filtros. */
export function visibleSagas(universe: Universe): Saga[] {
    return (universe.Sagas ?? []).filter(saga => sagaLibraryItems(saga).length > 0);
}

/** «Sin universo» no es un universo real: se presenta neutro. */
export function isNeutralUniverse(universe: Universe): boolean {
    return universe.Id === 1 || universe.Nombre === 'Sin universo';
}

export function libraryItemCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'título' : 'títulos'}`;
}

export function anthologySectionPageLabel(section: AnthologySection): string {
    if (section.PaginaInicio && section.PaginaFinal)
        return `Páginas ${section.PaginaInicio}–${section.PaginaFinal}`;
    if (section.Paginas)
        return `${section.Paginas} páginas`;
    return 'Sección de la antología';
}

export function anthologySectionProgress(section: AnthologySection): number {
    return Math.min(100, Math.max(0, section.PorcentajeCompletado ?? 0));
}
