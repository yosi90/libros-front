/**
 * Texto sin tildes ni mayúsculas, para comparar y buscar en español
 * («Leído» y «leido» coinciden). No recorta espacios: quien lo necesite añade `.trim()`.
 */
export function foldText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}
