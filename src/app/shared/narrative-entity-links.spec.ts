import { Book } from '../interfaces/book';
import { applyNarrativeEntityLinks, buildNarrativeEntityLinks } from './narrative-entity-links';

describe('narrative-entity-links', () => {
    const book = {
        Id: 7,
        Nombre: 'Libro',
        Personajes: [
            { Id: 1, Nombre: 'Shallan', Apodos: [{ Id: 10, ApodoId: 10, Apodo: 'Velo' }], Entradas: [], Estados: [], Relaciones: [], Sexo: null },
            { Id: 2, Nombre: 'Luz', Apodos: [], Entradas: [], Estados: [], Relaciones: [], Sexo: null }
        ],
        Localizaciones: [{ Id: 3, Nombre: 'Integridad duradera', Entradas: [] }],
        Organizaciones: [{ Id: 4, Nombre: 'Puente Cuatro', Entradas: [], Localizaciones: [], Personajes: [] }],
        Conceptos: [{ Id: 5, Nombre: 'Investidura', Entradas: [] }, { Id: 9, Nombre: 'Viaje', Entradas: [] }],
        Eventos: [{ Id: 6, Nombre: 'Día del llanto', Entradas: [], Personajes: [] }],
        Citas: [{ Id: 8, Nombre: 'Viaje antes que destino', Pagina: 12, Entradas: [] }],
        Autores: [],
        Estados: [],
        Capitulos: [],
        Partes: [],
        Interludios: [],
        Universo: { Id: 1, Nombre: 'Cosmere' },
        Saga: { Id: 1, Nombre: 'Archivo' },
        Orden: 1,
        Portada: ''
    } as Book;

    it('links capitalized character names', () => {
        const html = applyNarrativeEntityLinks('Shallan entro en la sala', buildNarrativeEntityLinks(book));

        expect(html).toContain('data-entity-kind="characters"');
        expect(html).toContain('data-target-url="/book/7/characters?selected=1"');
    });

    it('links character aliases to the owning character', () => {
        const html = applyNarrativeEntityLinks('Velo se escondio', buildNarrativeEntityLinks(book));

        expect(html).toContain('data-entity-kind="characters"');
        expect(html).toContain('data-target-url="/book/7/characters?selected=1"');
    });

    it('links multi-word locations', () => {
        const html = applyNarrativeEntityLinks('La torre de Integridad duradera resistio', buildNarrativeEntityLinks(book));

        expect(html).toContain('data-entity-kind="locations"');
        expect(html).toContain('Integridad duradera</span>');
    });

    it('does not link lowercase common words', () => {
        const html = applyNarrativeEntityLinks('la luz entro por la ventana', buildNarrativeEntityLinks(book));

        expect(html).not.toContain('rtf-narrative-link');
    });

    it('respects accents when matching', () => {
        const html = applyNarrativeEntityLinks('La Integridad duradera no era Integridad duradéra', buildNarrativeEntityLinks(book));

        expect((html.match(/rtf-narrative-link/g) ?? []).length).toBe(1);
    });

    it('does not link matches inside other words', () => {
        const html = applyNarrativeEntityLinks('SuperShallan no cuenta', buildNarrativeEntityLinks(book));

        expect(html).not.toContain('rtf-narrative-link');
    });

    it('prefers the longest overlapping mention', () => {
        const html = applyNarrativeEntityLinks('Viaje antes que destino', buildNarrativeEntityLinks(book));

        expect((html.match(/rtf-narrative-link/g) ?? []).length).toBe(1);
        expect(html).toContain('Viaje antes que destino</span>');
    });
});
