import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, effect, Input } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import type { StatisticsComponent, StatisticsTab } from '../../../shared/user-pages/statistics/statistics.component';
import { StatRow } from '../../../../shared/library-stats';

interface WebChartPalette {
    ink: string;
    muted: string;
    outline: string;
    primary: string;
    accent: string;
    status: string[];
}

/**
 * Vista Web de Estadísticas. Los datos y las series vienen del contenedor;
 * aquí solo se aplican colores del tema Web y la composición propia.
 */
@Component({
    selector: 'app-web-statistics-view',
    standalone: true,
    imports: [MatIconModule, NgApexchartsModule, NgTemplateOutlet, DecimalPipe],
    templateUrl: './web-statistics-view.component.html',
    styleUrl: './web-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebStatisticsViewComponent implements DoCheck {
    @Input({ required: true }) controller!: StatisticsComponent;

    // Opciones memorizadas: Apex vuelve a dibujar si cambia la identidad de sus entradas.
    donut: any = null;
    fastest: any = null;
    history: any = null;
    waiting: any = null;
    authors: any = null;
    styles: any = null;
    ratings: any = null;
    catalogStyles: any = null;
    catalogAuthors: any = null;
    languages: any = null;
    decades: any = null;
    communityMonthly: any = null;
    communityCards: Array<{ title: string; subtitle: string; chart: any; empty: string }> = [];
    biggestClubs: any = null;
    activeClubs: any = null;
    private builtGeneral = false;

    constructor(presentation: PresentationModeService, private changeDetector: ChangeDetectorRef) {
        effect(() => {
            presentation.state().webThemeChoice;
            // Espera a que la raíz aplique data-web-theme antes de leer los tokens.
            requestAnimationFrame(() => this.rebuild());
        });
    }

    selectTab(tab: StatisticsTab): void {
        this.controller.setTab(tab);
    }

    // El catálogo llega después, al abrir «General»: se dibuja en cuanto está.
    ngDoCheck(): void {
        if (this.controller && this.controller.generalLoaded !== this.builtGeneral)
            this.rebuild();
    }

    private rebuild(): void {
        if (!this.controller) return;
        const palette = this.readPalette();
        const base = { toolbar: { show: false }, foreColor: palette.muted, fontFamily: 'inherit', background: 'transparent' };
        const grid = { borderColor: palette.outline };
        const donut = this.controller.chartOptions;
        this.donut = {
            ...donut,
            chart: { ...donut.chart, ...base },
            colors: palette.status,
            stroke: { colors: ['transparent'] },
            legend: { labels: { colors: palette.ink } },
            plotOptions: { pie: { donut: { size: '64%', labels: { show: true, value: { color: palette.ink }, total: { show: true, label: 'Total', color: palette.muted } } } } }
        };
        const fastest = this.controller.fastestReadBooksChartOptions;
        this.fastest = fastest ? { ...fastest, chart: { ...fastest.chart, ...base }, colors: [palette.primary], grid } : null;
        const history = this.controller.readingHistoryChartOptions;
        this.history = history ? { ...history, chart: { ...history.chart, ...base }, colors: [palette.primary], grid, markers: { size: 5, strokeColors: palette.primary } } : null;

        const c = this.controller;
        this.waiting = this.bars(c.waitingBooks, palette, palette.accent, 'Días en espera', true);
        this.authors = this.bars(c.readAuthors, palette, palette.primary, 'Libros leídos', true);
        this.styles = this.bars(c.stylesRead, palette, palette.status[2], 'Libros leídos', true);
        this.ratings = this.bars(c.ratings, palette, palette.status[0], 'Libros', false);
        this.builtGeneral = c.generalLoaded;
        this.catalogStyles = this.bars(c.catalogStyles, palette, palette.primary, 'Títulos', true);
        this.catalogAuthors = this.bars(c.catalogAuthors, palette, palette.accent, 'Títulos', true);
        this.decades = this.bars(c.catalogDecades, palette, palette.status[4], 'Títulos', false);
        // Comunidad: solo se muestran los rankings con datos (la privacidad oculta grupos pequeños).
        const community: Array<[string, string, StatRow[], string, string]> = [
            ['Libros más leídos', 'Por número de lectores', c.communityBooks, palette.primary, 'Lectores'],
            ['Mejor valorados', 'Media de al menos tres valoraciones', c.communityTopRated, palette.status[0], 'Puntuación media'],
            ['Estilos más leídos', 'Lecturas por estilo', c.communityStyles, palette.status[2], 'Lecturas'],
            ['Autores más leídos', 'Lecturas por autor', c.communityAuthors, palette.accent, 'Lecturas'],
            ['Idiomas más leídos', 'Lecturas por idioma', c.communityLanguages, palette.status[4], 'Lecturas'],
            ['Sagas más leídas', 'Lecturas de libros de cada saga', c.communitySagas, palette.primary, 'Lecturas'],
            ['Universos más leídos', 'Lecturas de libros de cada universo', c.communityUniverses, palette.accent, 'Lecturas'],
            ['Antologías más leídas', 'Por número de lectores', c.communityAnthologies, palette.status[2], 'Lectores']
        ];
        this.communityCards = community
            .map(([title, subtitle, rows, color, name]) => ({ title, subtitle, chart: this.bars(rows, palette, color, name, true), empty: '' }))
            .filter(card => card.chart);
        const monthly = c.communityMonthly;
        this.communityMonthly = c.hasCommunityMonthly ? {
            series: [{ name: 'Libros terminados', data: monthly.map(month => month.value) }],
            chart: { type: 'bar', height: 260, width: '100%', ...base },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '52%' } },
            dataLabels: { enabled: false },
            xaxis: { categories: monthly.map(month => month.label), labels: { style: { colors: palette.muted } } },
            yaxis: { labels: { style: { colors: palette.muted } }, forceNiceScale: true },
            colors: [palette.primary],
            grid
        } : null;
        this.biggestClubs = this.bars(c.communityBiggestClubs, palette, palette.primary, 'Miembros', true);
        this.activeClubs = this.bars(c.communityActiveClubs, palette, palette.accent, 'Acciones en 30 días', true);

        this.languages = c.catalogLanguages.length ? {
            series: c.catalogLanguages.map(row => row.value),
            labels: c.catalogLanguages.map(row => row.label),
            chart: { type: 'donut', height: 300, ...base },
            colors: palette.status,
            stroke: { colors: ['transparent'] },
            dataLabels: { enabled: false },
            legend: { position: 'bottom', labels: { colors: palette.ink } },
            plotOptions: { pie: { donut: { size: '62%', labels: { show: true, value: { color: palette.ink }, total: { show: true, label: 'Títulos', color: palette.muted } } } } }
        } : null;
        this.changeDetector.markForCheck();
        // Apex mide el contenedor al montar; si la rejilla aún se estaba asentando, se redibuja al ancho final.
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    }

    /** Barras a partir de filas: horizontales para rankings, verticales para repartos ordenados. */
    private bars(rows: StatRow[], palette: WebChartPalette, color: string, name: string, horizontal: boolean): any {
        if (!rows.length) return null;
        const height = horizontal ? Math.max(180, rows.length * 38 + 60) : 280;
        return {
            series: [{ name, data: rows.map(row => row.value) }],
            chart: { type: 'bar', height, width: '100%', toolbar: { show: false }, foreColor: palette.muted, fontFamily: 'inherit', background: 'transparent' },
            plotOptions: { bar: { horizontal, borderRadius: 4, barHeight: '62%', columnWidth: '52%', distributed: false } },
            dataLabels: { enabled: horizontal, style: { colors: [palette.ink] }, offsetX: 18, formatter: (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1) },
            xaxis: { categories: rows.map(row => row.label), labels: { style: { colors: palette.muted } } },
            yaxis: { labels: { maxWidth: 220, style: { colors: palette.ink } } },
            colors: [color],
            grid: { borderColor: palette.outline },
            tooltip: { theme: document.documentElement.dataset['webTheme'] === 'dark' ? 'dark' : 'light' }
        };
    }

    private readPalette(): WebChartPalette {
        const styles = getComputedStyle(document.documentElement);
        const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
        const dark = document.documentElement.dataset['webTheme'] === 'dark';
        return {
            ink: token('--web-color-ink', '#1b211f'),
            muted: token('--web-color-ink-muted', '#5f6964'),
            outline: token('--web-color-outline', '#ddd7ca'),
            primary: token('--web-color-primary', '#0b6b5e'),
            accent: token('--web-color-accent', '#9a5b2e'),
            // En espera, En marcha, Leído, Por comprar, Quiero leer, Descartado.
            status: dark
                ? ['#e3b867', '#7fd6c4', '#c2de7c', '#8a978f', '#b9a2e0', '#f0948a']
                : ['#b98224', '#0b6b5e', '#6f9a28', '#a9b0aa', '#7a5ea8', '#b3261e']
        };
    }
}
