import { Saga, SagaLink } from '../interfaces/saga';

/**
 * Sagas encadenadas (Era 1 → Era 2): el backend calcula la familia y el orden
 * de lectura; aquí solo se agrupan y se describen. Nunca se infiere por el título.
 */

/** Mantiene juntas las sagas de una familia, en su orden de lectura; el resto conserva su orden. */
export function orderSagasByReading<T extends Pick<Saga, 'Id' | 'FamiliaSagaId' | 'OrdenLectura'>>(sagas: T[]): T[] {
    const familyRank = new Map<number, number>();
    sagas.forEach((saga, index) => {
        const family = saga.FamiliaSagaId ?? -saga.Id;
        if (!familyRank.has(family)) familyRank.set(family, index);
    });
    return sagas
        .map((saga, index) => ({ saga, index }))
        .sort((a, b) => {
            const familyA = familyRank.get(a.saga.FamiliaSagaId ?? -a.saga.Id)!;
            const familyB = familyRank.get(b.saga.FamiliaSagaId ?? -b.saga.Id)!;
            if (familyA !== familyB) return familyA - familyB;
            return (a.saga.OrdenLectura ?? 0) - (b.saga.OrdenLectura ?? 0) || a.index - b.index;
        })
        .map(entry => entry.saga);
}

/** Nombre corto de una saga enlazada: si comparte nombre con la actual basta el subtítulo («Era 1»). */
export function sagaLinkLabel(link: SagaLink, current?: Pick<Saga, 'Nombre'>): string {
    if (current && link.Subtitulo && link.Nombre === current.Nombre) return link.Subtitulo;
    return link.Subtitulo ? `${link.Nombre} · ${link.Subtitulo}` : link.Nombre;
}

/**
 * «Sigue a Era 1» y, si la siguiente no está en la lista mostrada (no la tienes),
 * «Continúa en Era 2». Null si no hay nada que contar.
 */
export function sagaChainCaption(saga: Saga, shown: Pick<Saga, 'Id'>[] = []): string | null {
    const shownIds = new Set(shown.map(item => item.Id));
    const previous = saga.SagasPrevias ?? [];
    const missingNext = (saga.SagasSiguientes ?? []).filter(link => !shownIds.has(link.Id));
    const parts = [
        previous.length ? `Sigue a ${previous.map(link => sagaLinkLabel(link, saga)).join(', ')}` : '',
        missingNext.length ? `Continúa en ${missingNext.map(link => sagaLinkLabel(link, saga)).join(', ')}` : ''
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
}

/**
 * Posición de una saga dentro de su familia en una lista ya ordenada: sirve
 * para dibujar el conector que une las sagas encadenadas.
 */
export function sagaChainPosition(sagas: Saga[], index: number): 'start' | 'middle' | 'end' | null {
    const family = sagas[index]?.FamiliaSagaId;
    if (family === undefined || family === null) return null;
    const previous = sagas[index - 1]?.FamiliaSagaId === family;
    const next = sagas[index + 1]?.FamiliaSagaId === family;
    if (previous && next) return 'middle';
    if (next) return 'start';
    if (previous) return 'end';
    return null;
}
