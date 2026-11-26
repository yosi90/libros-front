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

/** «a», «a y b», «a, b y c» (o con «ni»): una enumeración en español. */
export function joinList(items: ReadonlyArray<string | number>, conjunction: 'y' | 'ni' = 'y'): string {
    return items.length > 1
        ? `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`
        : String(items[0] ?? '');
}
