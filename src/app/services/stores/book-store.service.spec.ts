import { Book } from '../../interfaces/book';
import { Character } from '../../interfaces/character';
import { Location } from '../../interfaces/location';
import { BookStoreService } from './book-store.service';

describe('BookStoreService', () => {
    let store: BookStoreService;

    beforeEach(() => {
        store = new BookStoreService();
        store.setBook({
            ...store.libroVacio,
            Id: 7,
            Personajes: [{ Id: 1, Nombre: 'Ana', Grupo: 'Principales' } as unknown as Character],
            Localizaciones: [{ Id: 3, Nombre: 'Faro', Entradas: [] } as Location]
        } as Book);
    });

    it('añade un personaje nuevo como del libro actual y conserva lo que ya tenía uno conocido', () => {
        store.upsertCharacter(7, { Id: 2, Nombre: 'Bea' } as Character);
        store.upsertCharacter(7, { Id: 1, Nombre: 'Ana María' } as Character);

        const [ana, bea] = store.getBook().Personajes;
        expect(ana).toEqual(jasmine.objectContaining({ Id: 1, Nombre: 'Ana María', Grupo: 'Principales' }));
        expect(bea).toEqual(jasmine.objectContaining({ Id: 2, Nombre: 'Bea', EsLibroActual: true, OrigenContexto: 'actual' }));
    });

    it('añade o actualiza una localización tal cual llega', () => {
        store.upsertLocation(7, { Id: 4, Nombre: 'Puerto', Entradas: [] } as Location);
        store.upsertLocation(7, { Id: 3, Nombre: 'El faro' } as Location);

        expect(store.getBook().Localizaciones).toEqual([
            { Id: 3, Nombre: 'El faro', Entradas: [] } as Location,
            { Id: 4, Nombre: 'Puerto', Entradas: [] } as Location
        ]);
    });

    it('no toca otro libro ni acepta un elemento sin id', () => {
        const before = store.getBook();
        store.upsertLocation(8, { Id: 5, Nombre: 'Otro', Entradas: [] } as Location);
        store.upsertCharacter(7, { Nombre: 'Sin id' } as Character);

        expect(store.getBook()).toBe(before);
    });
});
