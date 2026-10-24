export interface NamedNarrativeEntity {
    Id: number | string;
    Nombre?: string | null;
}

function cleanName(name: string | null | undefined): string | undefined {
    return name && name.trim() ? name : undefined;
}

/**
 * Nombre de una entidad en una lista del libro. Compara los ids como números: hasta el
 * 24/10/2026 la API devolvía algunos ids como texto ("64") y otros como número (64).
 */
export function findNarrativeEntityName(
    entities: readonly NamedNarrativeEntity[] | null | undefined,
    id: number | string | null | undefined
): string | undefined {
    const target = Number(id);
    if (!Number.isFinite(target))
        return undefined;
    return cleanName((entities ?? []).find(entity => Number(entity.Id) === target)?.Nombre);
}

/**
 * Nombre visible de una entidad relacionada: el de la lista del libro, el que trae la fila de
 * la API (`Nombre`, resuelto en el mismo libro) y, solo si faltan ambos, la etiqueta de reserva.
 */
export function narrativeEntityDisplayName(
    entities: readonly NamedNarrativeEntity[] | null | undefined,
    id: number | string | null | undefined,
    rowName: string | null | undefined,
    fallbackLabel: string
): string {
    return findNarrativeEntityName(entities, id) ?? cleanName(rowName) ?? fallbackLabel;
}
