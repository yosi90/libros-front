import { Book } from '../interfaces/book';
import { createAdvancedSearchFilters, searchBook } from './book-advanced-search';

describe('book-advanced-search', () => {
    it('finds exact character matches', () => {
        const result = searchBook(createBook(), 'Dalinar');

        expect(result.mode).toBe('exact');
        expect(result.total).toBeGreaterThan(0);
        expect(result.groups.find(group => group.category === 'characters')?.results[0].title).toBe('Dalinar Kholin');
    });

    it('finds conservative fuzzy matches only when exact search is empty', () => {
        const result = searchBook(createBook(), 'Dlinar');

        expect(result.mode).toBe('fuzzy');
        expect(result.groups.find(group => group.category === 'characters')?.results[0].title).toBe('Dalinar Kholin');
    });

    it('matches compound aliases when the query omits spaces', () => {
        const result = searchBook(createBook(), 'spinanegra');

        expect(result.mode).toBe('exact');
        expect(result.groups.find(group => group.category === 'characters')?.results[0].matches[0].field).toBe('Apodo');
    });

    it('finds compound aliases with missing letters through fuzzy compact matching', () => {
        const result = searchBook(createBook(), 'spinangra');

        expect(result.mode).toBe('fuzzy');
        expect(result.groups.find(group => group.category === 'characters')?.results[0].title).toBe('Dalinar Kholin');
        expect(result.groups.find(group => group.category === 'characters')?.results[0].matches[0].field).toBe('Apodo');
    });

    it('finds short alias typos without matching compact text noise', () => {
        const result = searchBook(createBook(), 'vlo');

        expect(result.mode).toBe('fuzzy');
        expect(result.groups.find(group => group.category === 'characters')?.results[0].title).toBe('Shallan');
        expect(result.groups.find(group => group.category === 'chapters')?.results.length).toBe(0);
        expect(result.groups.find(group => group.category === 'concepts')?.results.length).toBe(0);
        expect(result.groups.find(group => group.category === 'quotes')?.results.length).toBe(0);
    });

    it('does not add fuzzy extras when an exact result exists', () => {
        const result = searchBook(createBook(), 'vela');

        expect(result.mode).toBe('exact');
        expect(result.groups.find(group => group.category === 'characters')?.results.length).toBe(0);
    });

    it('normalizes accents and casing', () => {
        const result = searchBook(createBook(), 'HONOR');

        expect(result.mode).toBe('exact');
        expect(result.groups.find(group => group.category === 'concepts')?.results[0].title).toBe('Honor');
    });

    it('searches RTF entries as plain text', () => {
        const result = searchBook(createBook(), 'juramento');

        expect(result.mode).toBe('exact');
        expect(result.groups.find(group => group.category === 'characters')?.results[0].title).toBe('Dalinar Kholin');
    });

    it('excludes disabled categories', () => {
        const filters = createAdvancedSearchFilters();
        filters.characters = false;

        const result = searchBook(createBook(), 'Dalinar', filters);

        expect(result.groups.find(group => group.category === 'characters')?.results.length).toBe(0);
    });
});

function createBook(): Book {
    return {
        Id: 1,
        Nombre: 'El camino de los reyes',
        Estados: [],
        Autores: [],
        Capitulos: [
            {
                Id: 10,
                Nombre: 'Honor ha muerto',
                Orden: 1,
                Pagina: 10,
                Escenas: [
                    {
                        Id: 100,
                        Nombre: 'La vela',
                        Descripcion: 'Dalinar sostiene una vela en la tormenta.',
                        Localizacion: { Id: 20, Nombre: 'Campos de batalla', Entradas: [] },
                        Personajes: [1],
                        Valida: true,
                        Eliminable: true
                    }
                ]
            }
        ],
        Partes: [],
        Interludios: [],
        Personajes: [
            {
                Id: 1,
                Nombre: 'Dalinar Kholin',
                Sexo: true,
                Entradas: [{ Id: 1, Nombre: 'Descripción', Descripcion: '{\\rtf1\\ansi juramento antiguo\\par}' }],
                Apodos: [{ Id: 1, ApodoId: 1, Apodo: 'Espina Negra' }],
                Estados: [],
                Relaciones: []
            },
            {
                Id: 2,
                Nombre: 'Shallan',
                Sexo: false,
                Entradas: [],
                Apodos: [{ Id: 2, ApodoId: 2, Apodo: 'Velo' }],
                Estados: [],
                Relaciones: []
            }
        ],
        Localizaciones: [{ Id: 20, Nombre: 'Campos de batalla', Entradas: [] }],
        Conceptos: [{ Id: 30, Nombre: 'Honor', Entradas: [{ Id: 2, Nombre: 'Ruido', Descripcion: 'v lo' }] }],
        Organizaciones: [],
        Eventos: [],
        Citas: [{ Id: 40, Nombre: 'No puedes tener mi dolor', Pagina: 100, Entradas: [{ Id: 3, Nombre: 'Ruido', Descripcion: 'v lo' }] }],
        Universo: { Id: 1, Nombre: 'Cosmere' },
        Saga: { Id: 1, Nombre: 'El archivo de las tormentas' },
        Orden: 1,
        Portada: ''
    };
}
