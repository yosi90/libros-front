import { Character } from '../interfaces/character';
import { SceneCharacterDetail } from '../interfaces/scene';
import { getApiErrorCode } from './api-error-message';
import { foldText } from './text';

/**
 * El reparto de una escena (rediseño del 6/11/2026, igual que la APK `RepartoDeEscena`): qué personajes coinciden con
 * lo escrito en el buscador o tras la @, cuándo se ofrece «Crear «…»» y qué queda en la escena al pulsar uno de los dos
 * iconos de un personaje.
 */

const byName = (a: Character, b: Character) => a.Nombre.localeCompare(b.Nombre, 'es', { sensitivity: 'base' });

/**
 * Los personajes que coinciden con `query`, sin tildes ni mayúsculas, por el nombre o por un apodo (no borrado):
 * primero los que empiezan así (o tienen una palabra que empieza así) y luego los que lo llevan dentro, cada grupo por
 * nombre. Sin consulta, todos por nombre. Los de `exclude` no salen.
 */
export function filterSceneCast(characters: Character[], query: string, exclude: ReadonlySet<number> = new Set()): Character[] {
    const term = foldText(query).trim();
    const candidates = characters.filter(character => !exclude.has(Number(character.Id)));
    if (!term)
        return [...candidates].sort(byName);
    return candidates
        .map(character => {
            const texts = [character.Nombre, ...(character.Apodos ?? []).filter(alias => !alias.Borrado).map(alias => alias.Apodo)]
                .map(text => foldText(text ?? '').trim());
            if (texts.some(text => text.startsWith(term) || text.split(' ').some(word => word.startsWith(term))))
                return { rank: 0, character };
            if (texts.some(text => text.includes(term)))
                return { rank: 1, character };
            return null;
        })
        .filter((match): match is { rank: number; character: Character } => !!match)
        .sort((a, b) => a.rank - b.rank || byName(a.character, b.character))
        .map(match => match.character);
}

/** El nombre con el que se ofrece «Crear «…»»: lo escrito sin espacios de más, si vale como nombre (3 a 100). */
export function castNameToCreate(query: string): string | null {
    const name = query.trim().replace(/\s+/g, ' ');
    return name.length >= 3 && name.length <= 100 ? name : null;
}

/**
 * Pulsar el icono «en escena» (`named` falso) o el de la @ (`named` verdadero) de un personaje: si ya estaba así, sale
 * de la escena; si no, entra así (o pasa a así, si estaba de la otra forma). Como un par de botones de radio que también
 * se pueden apagar.
 */
export function pressCastIcon(cast: ReadonlyArray<{ Id: number; Nombrado?: boolean }>, id: number, named: boolean): SceneCharacterDetail[] {
    const others = cast.filter(member => member.Id !== id).map(member => ({ Id: member.Id, Nombrado: !!member.Nombrado }));
    return cast.some(member => member.Id === id && !!member.Nombrado === named) ? others : [...others, { Id: id, Nombrado: named }];
}

/** La lista del reparto: primero los de `first` (los que estaban en la escena al abrirla) y luego el resto, sin mover nada más. */
export function withSceneCastFirst(characters: Character[], first: ReadonlySet<number>): Character[] {
    return [...characters.filter(character => first.has(Number(character.Id))), ...characters.filter(character => !first.has(Number(character.Id)))];
}

/** El personaje del libro que ya se llama así (sin tildes ni mayúsculas), para avisar antes de crear otro. */
export function findCharacterNamed(characters: Character[], name: string): Character | undefined {
    const target = foldText(name).trim();
    if (!target)
        return undefined;
    return characters.find(character => foldText(character.Nombre ?? '').trim() === target);
}

/** La pregunta de la hoja de alta cuando el nombre ya existe en el libro. */
export function duplicateCharacterQuestion(name: string): string {
    return `Ya hay un personaje llamado «${name}» en este libro. ¿Quieres crear otro con el mismo nombre?`;
}

/** Espera máxima de cada petición del alta de un personaje (la hoja de alta y la escena) antes de darla por fallida. */
export const CHARACTER_CREATE_TIMEOUT_MS = 30_000;

/**
 * La API rechazó el `IdCliente` del alta de un personaje (no es un UUID, o ya se usó en otro libro): el siguiente
 * intento lleva uno nuevo.
 */
export function isRejectedCharacterClientRequestId(error: unknown): boolean {
    const code = getApiErrorCode(error);
    return code === 'invalid_client_request_id' || code === 'character_client_request_conflict';
}
