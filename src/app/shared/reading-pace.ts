import { StatRow } from './library-stats';

/**
 * El ritmo de lectura (API `utils/reading_pace.py`): sale de cuándo se registra cada capítulo, que se guarda desde el
 * 25 de octubre de 2026. Los días y las horas son de Madrid. Lo de la comunidad y de una obra lleva el umbral de tres
 * personas que comparten sus estadísticas: `null` es «aún no hay datos suficientes», no cero.
 */
export const READING_PACE_SINCE = '25 de octubre de 2026';

export interface ReadingPaceBook {
    Desde: string;
    DiasActivos: number;
    PaginasPorDia: number;
    MejorDia: { Fecha: string; Paginas: number };
    MediaPersonalPorDia: number | null;
    /** La página más alta alcanzada al final de cada día con lectura. */
    Curva: Array<{ Fecha: string; Pagina: number }>;
}

export interface ReadingPaceUser {
    Desde: string;
    PaginasPorMes: Array<{ Anio: number; Mes: number; Paginas: number }>;
    DiasConLectura: number;
    PaginasPorDiaActivo: number;
    RachaActual: number;
    MejorRacha: number;
    /** De lunes a domingo. */
    PaginasPorDiaSemana: number[];
    PaginasPorHora: number[];
    CapitulosPorSemana: number;
}

export interface ReadingPaceCommunity {
    Desde: string | null;
    PaginasPorMes: Array<{ Anio: number; Mes: number; Paginas: number | null }>;
    RitmoMedio: number | null;
    Lectores: number | null;
}

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOUR_BANDS: Array<{ label: string; from: number; to: number }> = [
    { label: 'Madrugada (0–6 h)', from: 0, to: 6 },
    { label: 'Mañana (6–12 h)', from: 6, to: 12 },
    { label: 'Tarde (12–18 h)', from: 12, to: 18 },
    { label: 'Noche (18–24 h)', from: 18, to: 24 }
];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** «oct 2026», para las filas y los ejes por mes. */
export function monthLabel(month: { Anio: number; Mes: number }): string {
    return `${MONTHS[month.Mes - 1] ?? month.Mes} ${month.Anio}`;
}

/** Quita los meses a cero del principio: los doce meses empiezan antes de que se guardara nada. */
export function withoutLeadingZeros(rows: StatRow[]): StatRow[] {
    const first = rows.findIndex(row => row.value !== 0);
    return first < 0 ? [] : rows.slice(first);
}

export function paceMonthRows(months: Array<{ Anio: number; Mes: number; Paginas: number | null }>): StatRow[] {
    return withoutLeadingZeros(months
        .filter(month => month.Paginas !== null)
        .map(month => ({ label: monthLabel(month), value: month.Paginas as number })));
}

export function paceWeekdayRows(pages: number[]): StatRow[] {
    return WEEKDAYS.map((label, index) => ({ label, value: pages[index] ?? 0 }));
}

/** Las horas, en cuatro franjas: 24 filas no se leen de un vistazo. */
export function paceHourBandRows(pages: number[]): StatRow[] {
    return HOUR_BANDS.map(band => ({
        label: band.label,
        value: pages.slice(band.from, band.to).reduce((sum, value) => sum + (value ?? 0), 0)
    }));
}

/** El ritmo en una obra comparado con la media propia: «Más rápido que tu media», «A tu ritmo» o «Más pausado…». */
export function paceComparison(pace: ReadingPaceBook | null | undefined): string {
    const mine = pace?.MediaPersonalPorDia;
    if (!pace || mine === null || mine === undefined || mine <= 0) return '';
    const ratio = pace.PaginasPorDia / mine;
    if (ratio >= 1.15) return 'Más rápido que tu media';
    if (ratio <= 0.85) return 'Más pausado que tu media';
    return 'A tu ritmo de siempre';
}

/** «25 oct» para los ejes y las filas. */
export function paceDayLabel(isoDate: string): string {
    const date = new Date(`${isoDate}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
