import { Character } from '../interfaces/character';
import { characterGroupRank, groupCharactersByGroup } from './character-groups';

describe('character-groups', () => {
    const character = (Id: number, Nombre: string, Grupo?: Character['Grupo'], OrdenGrupo?: number) =>
        ({ Id, Nombre, Grupo, OrdenGrupo, Sexo: null }) as Character;

    it('ordena los grupos por su menor OrdenGrupo y deja «Sin grupo» donde le toque', () => {
        const groups = groupCharactersByGroup([
            character(1, 'Ánea', 'Secundarios', 3),
            character(2, 'Brea', 'Principales', 1),
            character(3, 'Cora'),
            character(4, 'Dara', 'Principales', 1)
        ]);

        expect(groups.map(group => group.label)).toEqual(['Principales', 'Secundarios', 'Sin grupo']);
        expect(groups[0].characters.map(member => member.Nombre)).toEqual(['Brea', 'Dara']);
    });

    it('filtra por nombre sin tener en cuenta tildes ni espacios del filtro', () => {
        const groups = groupCharactersByGroup([character(1, 'Ánea', 'Principales'), character(2, 'Brea', 'Principales')], ' anea ');

        expect(groups.length).toBe(1);
        expect(groups[0].characters.map(member => member.Nombre)).toEqual(['Ánea']);
    });

    it('da el orden narrativo de los grupos y manda al final lo que no tiene grupo', () => {
        expect(characterGroupRank('Principales')).toBe(1);
        expect(characterGroupRank('Antiguos')).toBe(6);
        expect(characterGroupRank('Sin grupo')).toBe(Number.MAX_SAFE_INTEGER);
        expect(characterGroupRank(undefined)).toBe(Number.MAX_SAFE_INTEGER);
    });
});
