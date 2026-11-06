import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { BookStatisticsSnapshot } from '../../../../interfaces/statistics';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { WebBookTitleComponent } from '../../ui/web-book-title/web-book-title.component';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';
import {
    BookChartPalette, ReadingProgress, castGroupsChart, castPerChapterChart, paceCurveChart, pacingChart, presenceHeatmap, readingProgress, topCast
} from '../../../../shared/book-charts';
import {
    ReadingMilestone, bestReadingDay, chapterPages, estimatedFinish, lastReadingDays, localDay, milestonesWithoutRepeats, pagesPerDay,
    paceVersusAverage, shortWeekday
} from '../../../../shared/reading-panel';
import { paceDayLabel } from '../../../../shared/reading-pace';

/** Una fila de «Últimos días»: el día, sus páginas y lo ancho de su barra. */
interface PanelDay { label: string; pages: number | null; width: number; best: boolean }
/** Una fila de «Reparto»: el nombre, su total y lo ancho de lo que aparece y de lo que solo se le nombra. */
interface PanelCast { name: string; total: number; present: number; named: number }

/** «Tu lectura» en casillas (rediseño del 6/11/2026, igual que la APK): lo que cada casilla enseña, ya calculado. */
interface ReadingPanel {
    progress: ReadingProgress;
    progressStart: string | null;
    progressEnd: string | null;
    paceValue: number | null;
    paceLine: string;
    paceVersus: string | null;
    chapters: number;
    scenes: number;
    chapterBars: number[];
    averagePages: number | null;
    days: PanelDay[];
    dates: Array<ReadingMilestone & { when: string }>;
    cast: PanelCast[];
    characters: number;
}

/** Las barras mini de «Capítulos»: las últimas que caben en la casilla. */
const MINI_BARS = 32;

/**
 * Resumen Web del libro, «Tu lectura» (rediseño del 6/11/2026, igual que la APK): un panel de casillas sin repetir
 * cifras (el progreso con su fin estimado, el ritmo frente a tu media, capítulos y escenas, los últimos días, las
 * fechas, el reparto y quién aparece en cada capítulo); los gráficos grandes quedan tras «Ver gráficos». Los datos
 * vienen del contenedor; aquí se calculan las casillas y los gráficos con los colores del tema.
 */
@Component({
    selector: 'app-web-book-statistics-view',
    standalone: true,
    imports: [CommonModule, MatIconModule, NgApexchartsModule, WebBookTitleComponent],
    templateUrl: './web-book-statistics-view.component.html',
    styleUrl: './web-book-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookStatisticsViewComponent implements DoCheck {
    @Input({ required: true }) controller!: BookStatisticsComponent;

    panel: ReadingPanel | null = null;
    /** «Ver gráficos»: los grandes, plegados. */
    chartsOpen = false;
    // Opciones memorizadas: Apex vuelve a dibujar si cambia la identidad de sus entradas.
    pacing: any = null;
    heatmap: any = null;
    cast: any = null;
    groups: any = null;
    paceCurve: any = null;
    private builtFor: BookStatisticsSnapshot | null = null;

    constructor(presentation: PresentationModeService, private changeDetector: ChangeDetectorRef) {
        effect(() => {
            presentation.state().webThemeChoice;
            // Espera a que la raíz aplique data-web-theme antes de leer los tokens.
            requestAnimationFrame(() => this.rebuild());
        });
    }

    get c(): BookStatisticsComponent { return this.controller; }

    get hasMoreCharts(): boolean {
        return !!(this.pacing || this.paceCurve || this.cast || this.groups);
    }

    ngDoCheck(): void {
        if (this.controller && this.c.snapshot !== this.builtFor)
            this.rebuild();
    }

    private rebuild(): void {
        if (!this.controller) return;
        const snapshot = this.c.snapshot;
        this.builtFor = snapshot;
        if (!snapshot) {
            this.panel = this.pacing = this.heatmap = this.cast = this.groups = this.paceCurve = null;
            return;
        }
        const palette = this.readPalette();
        this.panel = this.buildPanel(snapshot);
        this.pacing = pacingChart(snapshot, palette);
        this.heatmap = presenceHeatmap(this.c.book, snapshot, palette);
        this.cast = castPerChapterChart(snapshot, palette);
        this.groups = castGroupsChart(this.c.book, palette);
        this.paceCurve = paceCurveChart(this.c.readingPace, palette);
        this.changeDetector.markForCheck();
    }

    private buildPanel(snapshot: BookStatisticsSnapshot): ReadingPanel {
        const today = localDay(new Date()) as string;
        const pace = this.c.readingPace;
        const finished = !!this.c.finishedDate;
        const progress = readingProgress(this.c.book, snapshot, finished);
        const started = localDay(this.c.startedDate);
        const read = localDay(this.c.finishedDate);
        const finish = estimatedFinish(progress, pace, today, finished);

        const daily = pace ? pagesPerDay(pace).slice(-14).map(day => day.pages) : [];
        const lastDays = pace ? lastReadingDays(pace) : [];
        const best = bestReadingDay(lastDays);
        const topDay = Math.max(1, ...lastDays.map(day => day.pages ?? 0));
        const bars = chapterPages(snapshot).slice(-MINI_BARS);
        const topBar = Math.max(1, ...bars);
        const cast = topCast(snapshot);
        const topCastTotal = Math.max(1, ...cast.map(character => character.Total));
        const skip = new Set([started ? 'Comenzado' : '', read ? 'Leído' : ''].filter(Boolean));

        return {
            progress,
            progressStart: started ? `Comenzado ${paceDayLabel(started, today)}` : this.c.readingStateLabel || null,
            progressEnd: read ? `Leído ${paceDayLabel(read, today)}` : finish ? `Al ritmo actual, ${paceDayLabel(finish, today)}` : null,
            paceValue: pace?.PaginasPorDia ?? null,
            paceLine: this.linePoints(daily),
            paceVersus: paceVersusAverage(pace),
            chapters: snapshot.Capitulos.length,
            scenes: this.c.totalScenes,
            chapterBars: bars.map(pages => Math.max(4, Math.round(pages / topBar * 100))),
            averagePages: this.c.averagePagesByChapter,
            days: lastDays.map(day => ({
                label: shortWeekday(day.date),
                pages: day.pages && day.pages > 0 ? day.pages : null,
                width: day.pages && day.pages > 0 ? Math.round(day.pages / topDay * 100) : 0,
                best: day.date === best
            })),
            dates: milestonesWithoutRepeats(this.c.readingMilestones, skip).map(item => ({ ...item, when: paceDayLabel(item.day, today) })),
            cast: cast.map(character => ({
                name: character.Nombre,
                total: character.Total,
                present: character.Apariciones / topCastTotal * 100,
                named: character.Nombramientos / topCastTotal * 100
            })),
            characters: snapshot.Personajes.length
        };
    }

    /** La línea mini del ritmo: las páginas de cada día, de lado a lado, en una caja de 100 × 40. */
    private linePoints(values: number[]): string {
        if (!values.length) return '';
        const top = Math.max(1, ...values);
        const x = (index: number) => values.length === 1 ? 50 : index / (values.length - 1) * 100;
        const y = (value: number) => 3 + (1 - value / top) * 34;
        return values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
    }

    private readPalette(): BookChartPalette {
        const styles = getComputedStyle(document.documentElement);
        const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
        return {
            ink: token('--web-color-ink', '#1b211f'),
            muted: token('--web-color-ink-muted', '#5f6964'),
            outline: token('--web-color-outline', '#ddd7ca'),
            surface: token('--web-color-surface', '#fffdf8'),
            surfaceHigh: token('--web-color-surface-high', '#e7e2d6'),
            primary: token('--web-color-primary', '#0b6b5e'),
            accent: token('--web-color-accent', '#9a5b2e')
        };
    }
}
