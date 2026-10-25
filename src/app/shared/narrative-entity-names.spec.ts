import { findNarrativeEntityName, narrativeEntityDisplayName } from './narrative-entity-names';

describe('narrative entity names', () => {
    const characters = [{ Id: 331, Nombre: 'Dalinar' }, { Id: 956, Nombre: '' }];
    const legacyLocations = [{ Id: '64', Nombre: 'Alezkar' }];

    it('finds names comparing ids as numbers', () => {
        expect(findNarrativeEntityName(characters, 331)).toBe('Dalinar');
        expect(findNarrativeEntityName(legacyLocations, 64)).toBe('Alezkar');
        expect(findNarrativeEntityName(legacyLocations, '64')).toBe('Alezkar');
    });

    it('ignores empty names and missing ids', () => {
        expect(findNarrativeEntityName(characters, 956)).toBeUndefined();
        expect(findNarrativeEntityName(characters, 605)).toBeUndefined();
        expect(findNarrativeEntityName(undefined, 605)).toBeUndefined();
        expect(findNarrativeEntityName(characters, null)).toBeUndefined();
    });

    it('uses the API row name when the entity is not in the book list', () => {
        expect(narrativeEntityDisplayName(characters, 605, 'Aladar', 'Personaje 605')).toBe('Aladar');
        expect(narrativeEntityDisplayName(characters, 956, 'Dok', 'Personaje 956')).toBe('Dok');
    });

    it('prefers the book list and falls back to the label only without any name', () => {
        expect(narrativeEntityDisplayName(characters, 331, 'Otro', 'Personaje 331')).toBe('Dalinar');
        expect(narrativeEntityDisplayName(characters, 605, '  ', 'Personaje 605')).toBe('Personaje 605');
        expect(narrativeEntityDisplayName(characters, 605, undefined, 'Personaje 605')).toBe('Personaje 605');
    });
});
