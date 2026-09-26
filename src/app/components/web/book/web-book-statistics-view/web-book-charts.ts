import { Book } from '../../../../interfaces/book';
import { BookStatisticsSnapshot, ChapterStatistic } from '../../../../interfaces/statistics';

/** Colores del tema Web leídos de los tokens (ApexCharts necesita valores, no variables). */
export interface BookChartPalette {
    ink: string;
    muted: string;
    outline: string;
    surface: string;
    surfaceHigh: string;
    primary: string;
    accent: string;
}

export interface ReadingProgress {
    /** Última página alcanzada según los capítulos registrados. */
    page: number;
    /** Total de páginas del libro, si el catálogo lo tiene. */
    total: number | null;
    /** Porcentaje 0–100, o null sin total. */
    percent: number | null;
}

const HEATMAP_CHARACTER_LIMIT = 8;

export function orderedChapters(snapshot: BookStatisticsSnapshot): ChapterStatistic[] {
    return [...snapshot.Capitulos].sort((a, b) => a.Orden - b.Orden);
}

export function readingProgress(book: Book, snapshot: BookStatisticsSnapshot, finished: boolean): ReadingProgress {
    const page = Math.max(0, ...snapshot.Capitulos.map(chapter => Number(chapter.PaginaFinal ?? chapter.Pagina) || 0));
    const total = book.Paginas && book.Paginas > 0 ? book.Paginas : null;
    if (!total)
        return { page, total: null, percent: finished ? 100 : null };
    const percent = finished ? 100 : Math.min(100, Math.round((page / total) * 100));
    return { page, total, percent };
}

/** Mezcla dos colores hexadecimales: `weight` 1 devuelve `a`, 0 devuelve `b`. */
export function mixHex(a: string, b: string, weight: number): string {
    const parse = (hex: string) => {
        const value = hex.replace('#', '');
        const full = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
        return [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16) || 0);
    };
    const [ca, cb] = [parse(a), parse(b)];
    return '#' + ca.map((channel, index) => Math.round(channel * weight + cb[index] * (1 - weight)).toString(16).padStart(2, '0')).join('');
}

function baseChart(palette: BookChartPalette, type: string, height: number): Record<string, unknown> {
    return {
        type,
        height,
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: palette.muted,
        fontFamily: 'inherit',
        background: 'transparent',
        animations: { enabled: true, speed: 420 }
    };
}

export function progressChart(progress: ReadingProgress, palette: BookChartPalette): Record<string, unknown> {
    return {
        series: [progress.percent ?? 0],
        chart: { ...baseChart(palette, 'radialBar', 240), sparkline: { enabled: true } },
        colors: [palette.primary],
        plotOptions: {
            radialBar: {
                startAngle: -120,
                endAngle: 120,
                hollow: { size: '64%' },
                track: { background: palette.surfaceHigh, strokeWidth: '100%' },
                dataLabels: {
                    name: { show: true, offsetY: 26, color: palette.muted, fontSize: '13px' },
                    value: { show: true, offsetY: -12, color: palette.ink, fontSize: '34px', fontWeight: 600, formatter: (value: number) => `${Math.round(value)}%` }
                }
            }
        },
        stroke: { lineCap: 'round' },
        labels: ['leído']
    };
}

export function pacingChart(snapshot: BookStatisticsSnapshot, palette: BookChartPalette): Record<string, unknown> | null {
    const chapters = orderedChapters(snapshot).filter(chapter => chapter.PaginasEstimadas !== null);
    if (!chapters.length)
        return null;
    const pages = chapters.map(chapter => chapter.PaginasEstimadas ?? 0);
    const average = pages.reduce((total, value) => total + value, 0) / pages.length;
    return {
        series: [{ name: 'Páginas', data: pages }],
        chart: baseChart(palette, 'bar', 260),
        colors: [palette.primary],
        plotOptions: { bar: { borderRadius: 3, columnWidth: chapters.length > 30 ? '85%' : '60%' } },
        dataLabels: { enabled: false },
        grid: { borderColor: palette.outline, strokeDashArray: 3 },
        xaxis: {
            categories: chapters.map(chapter => String(chapter.Orden)),
            title: { text: 'Capítulo', style: { color: palette.muted, fontWeight: 500 } },
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { hideOverlappingLabels: true }
        },
        yaxis: { labels: { formatter: (value: number) => String(Math.round(value)) } },
        annotations: {
            yaxis: [{
                y: average,
                borderColor: palette.accent,
                strokeDashArray: 4,
                label: { text: `Media ${average.toFixed(1).replace('.', ',')}`, borderColor: 'transparent', style: { color: '#fff', background: palette.accent } }
            }]
        },
        tooltip: {
            x: { formatter: (_: unknown, options: { dataPointIndex: number }) => `${chapters[options.dataPointIndex].Orden}. ${chapters[options.dataPointIndex].Nombre}` },
            y: { formatter: (value: number) => String(value) }
        }
    };
}

export function castPerChapterChart(snapshot: BookStatisticsSnapshot, palette: BookChartPalette): Record<string, unknown> | null {
    const chapters = orderedChapters(snapshot);
    if (!chapters.some(chapter => chapter.PersonajesPresentes || chapter.PersonajesNombrados))
        return null;
    return {
        series: [
            { name: 'Aparecen', data: chapters.map(chapter => chapter.PersonajesPresentes) },
            { name: 'Solo nombrados', data: chapters.map(chapter => chapter.PersonajesNombrados) }
        ],
        chart: { ...baseChart(palette, 'bar', 260), stacked: true },
        colors: [palette.primary, palette.accent],
        plotOptions: { bar: { borderRadius: 2, columnWidth: chapters.length > 30 ? '85%' : '60%' } },
        dataLabels: { enabled: false },
        grid: { borderColor: palette.outline, strokeDashArray: 3 },
        legend: { position: 'top', horizontalAlign: 'left', labels: { colors: palette.ink } },
        xaxis: { categories: chapters.map(chapter => String(chapter.Orden)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { hideOverlappingLabels: true } },
        yaxis: { labels: { formatter: (value: number) => String(Math.round(value)) } },
        tooltip: {
            x: { formatter: (_: unknown, options: { dataPointIndex: number }) => `${chapters[options.dataPointIndex].Orden}. ${chapters[options.dataPointIndex].Nombre}` }
        }
    };
}

/**
 * Mapa de presencia: los personajes con más apariciones (filas) por capítulo
 * (columnas). Valor = escenas en las que aparece; 0,5 si solo se le nombra.
 */
export function presenceHeatmap(book: Book, snapshot: BookStatisticsSnapshot, palette: BookChartPalette): Record<string, unknown> | null {
    const characters = [...snapshot.Personajes].sort((a, b) => b.Total - a.Total).filter(row => row.Total > 0).slice(0, HEATMAP_CHARACTER_LIMIT);
    const chapters = [...book.Capitulos].sort((a, b) => Number(a.Orden) - Number(b.Orden));
    if (!characters.length || !chapters.length)
        return null;
    const series = characters.map(character => ({
        name: character.Nombre,
        data: chapters.map(chapter => {
            let present = 0;
            let named = false;
            for (const scene of chapter.Escenas ?? []) {
                // Cada personaje de escena llega como id (presente) o con su detalle.
                const link = (scene.Personajes ?? [])
                    .map(item => typeof item === 'number' ? { Id: item, Nombrado: false } : item)
                    .find(item => item.Id === character.Id);
                if (!link) continue;
                if (link.Nombrado) named = true;
                else present++;
            }
            return { x: String(chapter.Orden), y: present || (named ? 0.5 : 0) };
        })
    })).reverse();
    return {
        series,
        chart: baseChart(palette, 'heatmap', Math.max(200, characters.length * 34 + 60)),
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: [palette.surface] },
        plotOptions: {
            heatmap: {
                radius: 3,
                enableShades: false,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.1, color: palette.surfaceHigh, name: 'No sale' },
                        { from: 0.4, to: 0.6, color: mixHex(palette.accent, palette.surface, 0.7), name: 'Solo nombrado' },
                        { from: 0.9, to: 1.1, color: mixHex(palette.primary, palette.surface, 0.55), name: '1 escena' },
                        { from: 1.9, to: 999, color: palette.primary, name: 'Varias escenas' }
                    ]
                }
            }
        },
        legend: { position: 'top', horizontalAlign: 'left', labels: { colors: palette.ink, useSeriesColors: false } },
        xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { hideOverlappingLabels: true } },
        tooltip: {
            y: { formatter: (value: number) => value === 0.5 ? 'Solo nombrado' : value === 0 ? 'No sale' : `${value} ${value === 1 ? 'escena' : 'escenas'}` }
        }
    };
}

export function castGroupsChart(book: Book, palette: BookChartPalette): Record<string, unknown> | null {
    const counts = new Map<string, number>();
    for (const character of book.Personajes)
        counts.set(character.Grupo ?? 'Sin grupo', (counts.get(character.Grupo ?? 'Sin grupo') ?? 0) + 1);
    if (!counts.size)
        return null;
    const order = ['Principales', 'Recurrentes', 'Secundarios', 'Desaparecidos', 'Muertos', 'Antiguos', 'Sin grupo'];
    const labels = [...counts.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return {
        series: labels.map(label => counts.get(label) ?? 0),
        labels,
        chart: baseChart(palette, 'donut', 260),
        colors: [palette.primary, mixHex(palette.primary, palette.surface, 0.6), palette.accent, mixHex(palette.accent, palette.surface, 0.55), palette.muted, palette.outline, palette.surfaceHigh],
        stroke: { colors: [palette.surface], width: 2 },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', labels: { colors: palette.ink } },
        plotOptions: {
            pie: {
                donut: {
                    size: '66%',
                    labels: {
                        show: true,
                        value: { color: palette.ink, fontSize: '26px', fontWeight: 600 },
                        total: { show: true, label: 'Personajes', color: palette.muted }
                    }
                }
            }
        }
    };
}
