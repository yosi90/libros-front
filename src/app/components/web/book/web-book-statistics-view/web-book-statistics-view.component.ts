import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, effect, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { BookStatisticsSnapshot } from '../../../../interfaces/statistics';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import type { BookStatisticsComponent } from '../../../shared/book-pages/book-statistics/book-statistics.component';
import {
    BookChartPalette, ReadingProgress, castGroupsChart, castPerChapterChart, pacingChart, presenceHeatmap, progressChart, readingProgress
} from './web-book-charts';

/**
 * Resumen Web del libro: progreso de lectura, ritmo por capítulo, presencia de
 * personajes y reparto. Los datos vienen del contenedor; aquí se construyen los
 * gráficos con los colores del tema y se rehacen al cambiar de tema o de libro.
 */
@Component({
    selector: 'app-web-book-statistics-view',
    standalone: true,
    imports: [CommonModule, MatIconModule, NgApexchartsModule],
    templateUrl: './web-book-statistics-view.component.html',
    styleUrl: './web-book-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookStatisticsViewComponent implements DoCheck {
    @Input({ required: true }) controller!: BookStatisticsComponent;

    progress: ReadingProgress | null = null;
    // Opciones memorizadas: Apex vuelve a dibujar si cambia la identidad de sus entradas.
    progressOptions: any = null;
    pacing: any = null;
    heatmap: any = null;
    cast: any = null;
    groups: any = null;
    private builtFor: BookStatisticsSnapshot | null = null;

    constructor(presentation: PresentationModeService, private changeDetector: ChangeDetectorRef) {
        effect(() => {
            presentation.state().webThemeChoice;
            // Espera a que la raíz aplique data-web-theme antes de leer los tokens.
            requestAnimationFrame(() => this.rebuild());
        });
    }

    get c(): BookStatisticsComponent { return this.controller; }

    ngDoCheck(): void {
        if (this.controller && this.c.snapshot !== this.builtFor)
            this.rebuild();
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
        this.progress = readingProgress(this.c.book, snapshot, !!this.c.finishedDate);
        this.progressOptions = this.progress.percent === null ? null : progressChart(this.progress, palette);
        this.pacing = pacingChart(snapshot, palette);
        this.heatmap = presenceHeatmap(this.c.book, snapshot, palette);
        this.cast = castPerChapterChart(snapshot, palette);
        this.groups = castGroupsChart(this.c.book, palette);
        this.changeDetector.markForCheck();
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
