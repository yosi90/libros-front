import { CatalogItem, CollectionItem } from '../interfaces/catalog';
import { getStatusId } from './reading-status';

/** Una fila de un ranking o reparto: etiqueta, valor y, opcionalmente, un detalle. */
export interface StatRow {
    label: string;
    value: number;
    detail?: string;
}

const DAY_MS = 86_400_000;

function latestState(item: CollectionItem) {
    return [...(item.Estados ?? [])].sort((a, b) => (a.Fecha ?? '').localeCompare(b.Fecha ?? '')).at(-1) ?? null;
}

function isRead(item: CollectionItem): boolean {
    return (item.Estados ?? []).some(state => getStatusId(state) === 2);
}

function top(counts: Map<string, number>, limit: number): StatRow[] {
    return [...counts.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
        .slice(0, limit);
}

function styleNames(item: CatalogItem): string[] {
    const names = (item.Estilos ?? []).map(style => style.Nombre).filter(Boolean);
    return names.length ? names : item.Estilo ? [item.Estilo] : [];
}

// ---------- Personales (colección) ----------

/** Libros cuyo estado actual es «En espera», por días que llevan así. */
export function longestWaiting(items: CollectionItem[], now = Date.now(), limit = 8): StatRow[] {
    return items
        .map(item => ({ item, state: latestState(item) }))
        .filter(entry => entry.state && getStatusId(entry.state) === 0 && entry.state.Fecha)
        .map(entry => {
            const days = Math.max(0, Math.floor((now - new Date(entry.state!.Fecha).getTime()) / DAY_MS));
            return { label: entry.item.Nombre, value: days, detail: `${days} ${days === 1 ? 'día' : 'días'}` };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

/** Autores con más libros leídos. */
export function topReadAuthors(items: CollectionItem[], limit = 8): StatRow[] {
    const counts = new Map<string, number>();
    for (const item of items.filter(isRead))
        for (const author of item.Autores ?? [])
            counts.set(author.Nombre, (counts.get(author.Nombre) ?? 0) + 1);
    return top(counts, limit);
}

/** Estilos de los libros leídos. */
export function readStyles(items: CollectionItem[], limit = 8): StatRow[] {
    const counts = new Map<string, number>();
    for (const item of items.filter(isRead))
        for (const style of styleNames(item))
            counts.set(style, (counts.get(style) ?? 0) + 1);
    return top(counts, limit);
}

/** Cuántos libros has puntuado con 1, 2… 5 estrellas. */
export function ratingDistribution(items: CollectionItem[]): StatRow[] {
    const rows = [1, 2, 3, 4, 5].map(stars => ({ label: `${stars} ★`, value: 0 }));
    for (const item of items) {
        const rating = Math.round(Number(item.Puntuacion));
        if (rating >= 1 && rating <= 5) rows[rating - 1].value++;
    }
    return rows.some(row => row.value) ? rows : [];
}

// ---------- Generales (catálogo) ----------

export function catalogByStyle(items: CatalogItem[], limit = 10): StatRow[] {
    const counts = new Map<string, number>();
    for (const item of items)
        for (const style of styleNames(item))
            counts.set(style, (counts.get(style) ?? 0) + 1);
    return top(counts, limit);
}

export function catalogTopAuthors(items: CatalogItem[], limit = 10): StatRow[] {
    const counts = new Map<string, number>();
    for (const item of items)
        for (const author of item.Autores ?? [])
            counts.set(author.Nombre, (counts.get(author.Nombre) ?? 0) + 1);
    return top(counts, limit);
}

export function catalogByLanguage(items: CatalogItem[], limit = 8): StatRow[] {
    const counts = new Map<string, number>();
    for (const item of items)
        for (const language of item.IdiomasDisponibles ?? [])
            if (language?.Nombre) counts.set(language.Nombre, (counts.get(language.Nombre) ?? 0) + 1);
    return top(counts, limit);
}

/** Títulos por década de publicación, en orden cronológico. */
export function catalogByDecade(items: CatalogItem[]): StatRow[] {
    const counts = new Map<number, number>();
    for (const item of items) {
        const year = Number((item.FechaPublicacion ?? '').slice(0, 4));
        if (year > 1000) counts.set(Math.floor(year / 10) * 10, (counts.get(Math.floor(year / 10) * 10) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([decade, value]) => ({ label: `${decade}s`, value }));
}
