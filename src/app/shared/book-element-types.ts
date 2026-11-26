import type { Book } from '../interfaces/book';

/** Los seis tipos de elemento narrativo de un libro: su nombre, su ruta de lista, la de alta y dónde los trae el libro. */
export interface BookElementType {
    label: string;
    singular: string;
    icon: string;
    listRoute: 'characters' | 'organizations' | 'events' | 'locations' | 'concepts' | 'quotes';
    createRoute: string;
    bookKey: 'Personajes' | 'Organizaciones' | 'Eventos' | 'Localizaciones' | 'Conceptos' | 'Citas';
}

export const BOOK_ELEMENT_TYPES: readonly BookElementType[] = [
    { label: 'Personajes', singular: 'personaje', icon: 'co_present', listRoute: 'characters', createRoute: 'character', bookKey: 'Personajes' },
    { label: 'Organizaciones', singular: 'organización', icon: 'groups', listRoute: 'organizations', createRoute: 'organization', bookKey: 'Organizaciones' },
    { label: 'Eventos', singular: 'evento', icon: 'event', listRoute: 'events', createRoute: 'event', bookKey: 'Eventos' },
    { label: 'Localizaciones', singular: 'localización', icon: 'my_location', listRoute: 'locations', createRoute: 'location', bookKey: 'Localizaciones' },
    { label: 'Conceptos', singular: 'concepto', icon: 'auto_awesome', listRoute: 'concepts', createRoute: 'concept', bookKey: 'Conceptos' },
    { label: 'Citas', singular: 'cita', icon: 'format_quote', listRoute: 'quotes', createRoute: 'quote', bookKey: 'Citas' },
];

/** El tipo de una ruta hija del libro (`characters`, `character`…), o `undefined` si no es de elementos. */
export function bookElementTypeOf(route: string): BookElementType | undefined {
    return BOOK_ELEMENT_TYPES.find(type => type.listRoute === route || type.createRoute === route);
}

export function bookElementCount(book: Book, type: BookElementType): number {
    const items = book[type.bookKey];
    return Array.isArray(items) ? items.length : 0;
}
