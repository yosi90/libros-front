import { StatRow } from './library-stats';
import { monthLabel, withoutLeadingZeros } from './reading-pace';

/**
 * Las puntuaciones y reseñas en el tiempo (API `utils/rating_history.py`): sale de cuándo se puntúa y se reseña cada
 * obra, que se guarda desde el 25 de octubre de 2026 (la última vez que cambia cada una). Los meses son de Madrid. Lo
 * de la comunidad y de una obra lleva el umbral de tres personas que comparten sus estadísticas: `null` es «aún no hay
 * datos suficientes», no cero.
 */
export const RATING_HISTORY_SINCE = '25 de octubre de 2026';

export interface RatingMonth {
    Anio: number;
    Mes: number;
    Puntuaciones: number | null;
    Resenas: number | null;
    NotaMedia: number | null;
}

export interface RatingHistoryUser {
    Desde: string;
    PorMes: RatingMonth[];
    NotaMedia: number | null;
}

export interface RatingHistoryCommunity {
    Desde: string | null;
    PorMes: RatingMonth[];
}

export interface RatingOwn {
    Puntuacion: number | null;
    FechaPuntuacion: string | null;
    FechaResena: string | null;
}

export interface RatingEvolutionMonth {
    Anio: number;
    Mes: number;
    NotaMedia: number | null;
    Puntuaciones: number | null;
}

/** Puntuaciones por mes, desde el primero con alguna; los meses ocultos por el umbral (null) no salen como cero. */
export function ratingCountRows(months: RatingMonth[] | null | undefined): StatRow[] {
    return withoutLeadingZeros((months ?? [])
        .filter(month => month.Puntuaciones !== null)
        .map(month => ({ label: monthLabel(month), value: month.Puntuaciones as number })));
}

/** La nota media de los meses que la tienen. */
export function ratingAverageRows(months: RatingMonth[] | null | undefined): StatRow[] {
    return (months ?? [])
        .filter(month => month.NotaMedia !== null)
        .map(month => ({ label: monthLabel(month), value: month.NotaMedia as number }));
}

/** Reseñas escritas en los últimos doce meses (sin los meses ocultos). */
export function ratingReviewTotal(months: RatingMonth[] | null | undefined): number {
    return (months ?? []).reduce((total, month) => total + (month.Resenas ?? 0), 0);
}

/** La evolución de la nota de una obra, solo los meses con dato, como «oct 2026 · 4,2». */
export function ratingEvolutionRows(months: RatingEvolutionMonth[] | null | undefined): Array<{ label: string; value: string }> {
    return (months ?? [])
        .filter(month => month.NotaMedia !== null)
        .map(month => ({ label: monthLabel(month), value: (month.NotaMedia as number).toLocaleString('es-ES', { maximumFractionDigits: 2 }) }));
}
