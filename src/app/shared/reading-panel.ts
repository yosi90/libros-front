import { BookStatisticsSnapshot, CharacterBookStatistic } from '../interfaces/statistics';
import { orderedChapters, ReadingProgress } from './book-charts';
import { DAY_MS } from './library-stats';
import { ReadingPaceBook } from './reading-pace';

/**
 * Lo que calcula «Tu lectura» en su panel de casillas (rediseño del 6/11/2026, igual que la APK `PanelDeLectura`).
 * Solo con lo que ya llega del libro: la curva y las cifras de su ritmo (`Metricas.Ritmo`), sus capítulos y escenas y
 * los estados con fecha. Nada se inventa: lo que no se puede calcular no sale. Los días van como «AAAA-MM-DD».
 */

/** Un día de la lectura: sus páginas, o `null` si ese día no se leyó. */
export interface ReadingDay {
    date: string;
    pages: number | null;
}

/** Una fecha de la lectura con su día y, si lo tiene, un detalle (la puntuación). */
export interface ReadingMilestone {
    label: string;
    date: string;
    detail: string;
}

/** Una estimación más allá de esto no dice nada: no se enseña. */
const MAX_ESTIMATE_DAYS = 730;

const dayTime = (day: string) => Date.parse(`${day.slice(0, 10)}T00:00:00Z`);
const dayFromTime = (time: number) => new Date(time).toISOString().slice(0, 10);
const isDay = (value: string | null | undefined): value is string => !!value && !Number.isNaN(dayTime(value));

/** El día que sigue a `day` (o lo precede, con `delta` negativo). */
export function addDays(day: string, delta: number): string {
    return dayFromTime(dayTime(day) + delta * DAY_MS);
}

/** El día local de una fecha de la API («2026-10-27T10:00:00») o de una `Date`, como «AAAA-MM-DD». */
export function localDay(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Las páginas de cada día con lectura, en orden: lo que sube la curva de un día al siguiente (la API la da como la
 * página más alta al final de cada día). El primer día sube desde el punto de partida, que la API no manda: se deduce
 * de sus cifras (páginas por día × días), sin bajar de 0 ni pasar del primer punto.
 */
export function pagesPerDay(pace: ReadingPaceBook): Array<{ date: string; pages: number }> {
    const points = (pace.Curva ?? []).filter(point => isDay(point.Fecha)).map(point => ({ date: point.Fecha.slice(0, 10), page: point.Pagina }));
    if (!points.length) return [];
    const read = Math.round(pace.PaginasPorDia * pace.DiasActivos);
    let previous = Math.min(Math.max(points[points.length - 1].page - read, 0), points[0].page);
    return points.map(point => {
        const pages = Math.max(point.page - previous, 0);
        previous = Math.max(previous, point.page);
        return { date: point.date, pages };
    });
}

/** Los últimos `count` días naturales hasta el último con lectura, del más reciente al más antiguo. */
export function lastReadingDays(pace: ReadingPaceBook, count = 7): ReadingDay[] {
    const byDay = new Map(pagesPerDay(pace).map(day => [day.date, day.pages]));
    const last = [...byDay.keys()].sort().pop();
    if (!last) return [];
    return Array.from({ length: count }, (_, back) => {
        const date = addDays(last, -back);
        return { date, pages: byDay.get(date) ?? null };
    });
}

/** El día con más páginas (el primero, si empatan): el que se destaca. `null` si ninguno pasa de 0. */
export function bestReadingDay(days: ReadingDay[]): string | null {
    let best: ReadingDay | null = null;
    for (const day of days)
        if ((day.pages ?? 0) > 0 && (!best || (day.pages ?? 0) > (best.pages ?? 0))) best = day;
    return best?.date ?? null;
}

/** «+3 sobre tu media», «2 bajo tu media» o «Como tu media», en páginas por día redondeadas; `null` sin media. */
export function paceVersusAverage(pace: ReadingPaceBook | null | undefined): string | null {
    const average = pace?.MediaPersonalPorDia;
    if (!pace || !average || average <= 0) return null;
    const difference = Math.round(pace.PaginasPorDia - average);
    if (difference > 0) return `+${difference} sobre tu media`;
    if (difference < 0) return `${-difference} bajo tu media`;
    return 'Como tu media';
}

/**
 * Las páginas por día natural desde que empezó a registrarse (`Ritmo.Desde`) hasta `today`, los dos incluidos: el
 * ritmo de verdad de la estimación (el de la API cuenta solo los días con lectura y la adelantaría).
 */
export function naturalPace(pace: ReadingPaceBook | null | undefined, today: string): number | null {
    if (!pace) return null;
    const since = isDay(pace.Desde) ? pace.Desde : pace.Curva?.[0]?.Fecha;
    if (!isDay(since)) return null;
    const read = pagesPerDay(pace).reduce((total, day) => total + day.pages, 0);
    const days = Math.round((dayTime(today) - dayTime(since)) / DAY_MS) + 1;
    return read > 0 && days > 0 ? read / days : null;
}

/**
 * Cuándo se acabaría al ritmo natural (`naturalPace`): `today` más los días que faltan para las páginas que quedan.
 * `null` sin total, ya terminado, sin ritmo o si sale más de dos años.
 */
export function estimatedFinish(progress: ReadingProgress, pace: ReadingPaceBook | null | undefined, today: string, finished: boolean): string | null {
    if (finished || !progress.total) return null;
    const left = progress.total - progress.page;
    if (left <= 0) return null;
    const perDay = naturalPace(pace, today);
    if (!perDay || perDay <= 0) return null;
    const days = Math.ceil(left / perDay);
    return days > MAX_ESTIMATE_DAYS ? null : addDays(today, days);
}

/** «jue 5». */
export function shortWeekday(day: string): string {
    const date = new Date(dayTime(day));
    return `${date.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' }).replace(/\./g, '')} ${date.getUTCDate()}`;
}

/** Las fechas con dato, de la más reciente a la más antigua; las de `skip` ya salen en otra casilla y no se repiten. */
export function milestonesWithoutRepeats(milestones: ReadingMilestone[], skip: ReadonlySet<string>): Array<ReadingMilestone & { day: string }> {
    return milestones
        .filter(milestone => !skip.has(milestone.label))
        .map(milestone => ({ ...milestone, day: localDay(milestone.date) }))
        .filter((milestone): milestone is ReadingMilestone & { day: string } => !!milestone.day)
        .sort((a, b) => b.day.localeCompare(a.day));
}

/** Los personajes con más registros (aparece + nombrado), de más a menos; solo los que tienen alguno. */
export function topCast(snapshot: BookStatisticsSnapshot, count = 5): CharacterBookStatistic[] {
    return [...snapshot.Personajes].filter(character => character.Total > 0).sort((a, b) => b.Total - a.Total).slice(0, count);
}

/** Las páginas de cada capítulo por su orden (para las barras mini); vacío si ninguno las tiene. */
export function chapterPages(snapshot: BookStatisticsSnapshot): number[] {
    return orderedChapters(snapshot).filter(chapter => chapter.PaginasEstimadas !== null).map(chapter => chapter.PaginasEstimadas ?? 0);
}
