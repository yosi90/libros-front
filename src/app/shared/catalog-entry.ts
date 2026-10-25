/**
 * Cuándo entró una obra en el catálogo (`FechaAlta`, UTC). En las obras de antes de guardarla es aproximada
 * (`FechaAltaAproximada`): se enseña solo el mes y lo dice.
 */
export function catalogEntryText(entry: string | null | undefined, approximate: boolean | null | undefined): string {
    if (!entry) return '';
    const date = new Date(entry);
    if (Number.isNaN(date.getTime())) return '';
    return approximate
        ? `Desde ${date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} (aproximada)`
        : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
