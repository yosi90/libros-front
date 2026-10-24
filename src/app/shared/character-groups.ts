import { Character } from '../interfaces/character';
import { foldText } from './text';

export type CharacterGroupName = NonNullable<Character['Grupo']>;

/** Orden narrativo de los grupos de personajes; los personajes sin grupo van al final. */
export const CHARACTER_GROUP_ORDER: readonly CharacterGroupName[] = [
    'Principales', 'Recurrentes', 'Secundarios', 'Desaparecidos', 'Muertos', 'Antiguos'
];

/** Posición (desde 1) de un grupo en CHARACTER_GROUP_ORDER; sin grupo o desconocido, al final. */
export function characterGroupRank(group: string | null | undefined): number {
    const index = CHARACTER_GROUP_ORDER.indexOf(group as CharacterGroupName);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index + 1;
}

export interface CharacterGroup {
    label: string;
    characters: Character[];
}

/**
 * Agrupa los personajes por su grupo («Sin grupo» si no tienen), conservando el orden
 * recibido dentro de cada grupo, y ordena los grupos por su menor OrdenGrupo y su nombre.
 * `filter` deja solo los personajes cuyo nombre lo contiene, sin tener en cuenta tildes.
 */
export function groupCharactersByGroup(characters: Character[], filter = ''): CharacterGroup[] {
    const groups = new Map<string, Character[]>();
    const term = foldText(filter).trim();
    characters
        .filter(character => !term || foldText(character.Nombre).trim().includes(term))
        .forEach(character => {
            const label = character.Grupo || 'Sin grupo';
            groups.set(label, [...(groups.get(label) ?? []), character]);
        });

    return [...groups.entries()]
        .map(([label, members]) => ({ label, characters: members }))
        .sort((a, b) => {
            const orderA = Math.min(...a.characters.map(character => character.OrdenGrupo ?? Number.MAX_SAFE_INTEGER));
            const orderB = Math.min(...b.characters.map(character => character.OrdenGrupo ?? Number.MAX_SAFE_INTEGER));
            if (orderA !== orderB)
                return orderA - orderB;
            return a.label.localeCompare(b.label);
        });
}
