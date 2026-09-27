import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { BookStatisticsSnapshot } from '../../../../interfaces/statistics';
import {
    BookChartPalette, ReadingProgress, castGroupsChart, castPerChapterChart, orderedChapters, pacingChart, presenceHeatmap, progressChart, readingProgress
} from '../../../../shared/book-charts';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';

/** Anchura mínima por capítulo en los gráficos por capítulo: si no caben, desplazan en horizontal. */
const CHAPTER_COLUMN_PX = 26;

/**
 * Resumen del libro en la APK: los mismos gráficos que la Web, compuestos como
 * pantalla nativa (tarjetas a ancho completo; dos columnas en plegable abierto).
 */
@Component({
    selector: 'app-mobile-book-statistics-view',
    standalone: true,
    imports: [CommonModule, MatIconModule, NgApexchartsModule],
    templateUrl: './mobile-book-statistics-view.component.html',
    styleUrl: './mobile-book-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookStatisticsViewComponent implements OnInit, DoCheck, OnDestroy {
    @Input({ required: true }) controller!: BookStatisticsComponent;

    progress: ReadingProgress | null = null;
    progressOptions: any = null;
    pacing: any = null;
    heatmap: any = null;
    cast: any = null;
    groups: any = null;
    chartMinWidth = 0;
    private builtFor: BookStatisticsSnapshot | null = null;
    private themeObserver: MutationObserver | null = null;

    constructor(private changeDetector: ChangeDetectorRef) { }

    get c(): BookStatisticsComponent { return this.controller; }

    ngOnInit(): void {
        // El tema claro/oscuro de la APK vive en un atributo de la raíz: al cambiar, se recolorean los gráficos.
        if (typeof MutationObserver !== 'undefined') {
            this.themeObserver = new MutationObserver(() => requestAnimationFrame(() => this.rebuild()));
            this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mobile-theme'] });
        }
    }

    ngDoCheck(): void {
        if (this.controller && this.c.snapshot !== this.builtFor)
            this.rebuild();
    }

    ngOnDestroy(): void {
        this.themeObserver?.disconnect();
    }

    savePurchaseDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (!value) return;
        this.c.purchaseDate.setValue(new Date(`${value}T00:00:00`));
        this.c.savePurchaseDate();
    }

    private rebuild(): void {
        if (!this.controller) return;
        const snapshot = this.c.snapshot;
        this.builtFor = snapshot;
        if (!snapshot) {
            this.progress = this.progressOptions = this.pacing = this.heatmap = this.cast = this.groups = null;
            return;
        }
        const palette = this.readPalette();
        const compact = (options: any, height: number) => options ? { ...options, chart: { ...options.chart, height } } : null;
        this.progress = readingProgress(this.c.book, snapshot, !!this.c.finishedDate);
        this.progressOptions = this.progress.percent === null ? null : compact(progressChart(this.progress, palette), 210);
        this.pacing = compact(pacingChart(snapshot, palette), 220);
        this.heatmap = presenceHeatmap(this.c.book, snapshot, palette);
        this.cast = compact(castPerChapterChart(snapshot, palette), 220);
        this.groups = compact(castGroupsChart(this.c.book, palette), 240);
        this.chartMinWidth = orderedChapters(snapshot).length * CHAPTER_COLUMN_PX;
        this.changeDetector.markForCheck();
    }

    private readPalette(): BookChartPalette {
        const styles = getComputedStyle(document.documentElement);
        const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
        return {
            ink: token('--mobile-color-ink', '#18211e'),
            muted: token('--mobile-color-ink-muted', '#5d6863'),
            outline: token('--mobile-color-outline', '#c4ccc7'),
            surface: token('--mobile-color-surface', '#fffdf8'),
            surfaceHigh: token('--mobile-color-surface-high', '#e1ded5'),
            primary: token('--mobile-color-primary', '#006b5d'),
            accent: token('--mobile-color-warning', '#805600')
        };
    }
}
