import { ChapterStatistic, CharacterBookStatistic, BookStatisticsSnapshot } from '../interfaces/statistics';

/** Clasificaciones «Top 10» de las estadísticas del libro, comunes a Mobile y Web. */
export function topPageRows(snapshot: BookStatisticsSnapshot | null | undefined): ChapterStatistic[] {
    return [...(snapshot?.Capitulos ?? [])]
        .filter(row => row.PaginasEstimadas !== null)
        .sort((a, b) => (b.PaginasEstimadas ?? 0) - (a.PaginasEstimadas ?? 0))
        .slice(0, 10);
}

export function topCharacterRows(snapshot: BookStatisticsSnapshot | null | undefined): CharacterBookStatistic[] {
    return [...(snapshot?.Personajes ?? [])].sort((a, b) => b.Total - a.Total).slice(0, 10);
}

export function topChapterCharacterRows(snapshot: BookStatisticsSnapshot | null | undefined): ChapterStatistic[] {
    return [...(snapshot?.Capitulos ?? [])]
        .sort((a, b) => chapterCharacterTotal(b) - chapterCharacterTotal(a))
        .slice(0, 10);
}

export function chapterCharacterTotal(row: ChapterStatistic): number {
    return row.PersonajesPresentes + row.PersonajesNombrados;
}

/** Máximo de una serie para escalar barras; nunca 0 para no dividir por cero. */
export function rankingMax(values: number[]): number {
    return Math.max(1, ...values);
}
