/**
 * La «@» del texto de una escena (rediseño del 6/11/2026, igual que la APK `Menciones`): al escribir «@» y unas letras
 * se ofrecen los personajes que coinciden, y al elegir uno lo escrito desde la @ se cambia por su nombre.
 */

/** Una «@» que se está escribiendo: del carácter de la @ (`start`) al cursor (`end`), y lo escrito tras ella. */
export interface Mention {
    start: number;
    end: number;
    query: string;
}

/** Lo más largo que se busca tras la @: más es que ya no se está escribiendo un nombre. */
export const MENTION_MAX_LENGTH = 40;

const OPENERS = '([{«"\'¿¡—-';
const isSpace = (char: string) => /\s/u.test(char);
const isLetterOrDigit = (char: string) => /[\p{L}\p{N}]/u.test(char);

/**
 * La @ que se está escribiendo justo antes de `caret` («…a su derecha, @cur|» da la de «@cur»), o `null`. La @ va al
 * principio o detrás de un espacio, un salto o un signo de apertura (no en medio de una palabra, como en un correo), y
 * entre ella y el cursor hay al menos una letra y ningún espacio, salto ni otra @.
 */
export function mentionInProgress(text: string, caret: number): Mention | null {
    if (caret <= 0 || caret > text.length)
        return null;
    for (let index = caret - 1; index >= 0 && caret - index <= MENTION_MAX_LENGTH + 1; index--) {
        const char = text[index];
        if (char === '@') {
            const before = index === 0 ? null : text[index - 1];
            if (before !== null && !isSpace(before) && !OPENERS.includes(before))
                return null;
            const query = text.slice(index + 1, caret);
            if (!query || !isLetterOrDigit(query[0]))
                return null;
            return { start: index, end: caret, query };
        }
        if (isSpace(char))
            return null;
    }
    return null;
}

/** Lo que entra en lugar de la mención: el nombre y un espacio, si detrás no hay ya uno. */
export function mentionInsertion(text: string, mention: Mention, name: string): string {
    const next = text[mention.end];
    return next !== undefined && isSpace(next) ? name : `${name} `;
}

/** El texto con la mención cambiada por `name`, y el cursor detrás del nombre y de su espacio. */
export function replaceMention(text: string, mention: Mention, name: string): { text: string; caret: number } {
    const inserted = mentionInsertion(text, mention, name);
    return { text: text.slice(0, mention.start) + inserted + text.slice(mention.end), caret: mention.start + name.length + 1 };
}
