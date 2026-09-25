import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import type { StatisticsComponent } from '../../../shared/user-pages/statistics/statistics.component';

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
    imports: [MatIconModule, NgApexchartsModule],
    templateUrl: './web-statistics-view.component.html',
    styleUrl: './web-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebStatisticsViewComponent {
    @Input({ required: true }) controller!: StatisticsComponent;

    // Opciones memorizadas: Apex vuelve a dibujar si cambia la identidad de sus entradas.
    donut: any = null;
    fastest: any = null;
    history: any = null;

    constructor(presentation: PresentationModeService, private changeDetector: ChangeDetectorRef) {
        effect(() => {
            presentation.state().webThemeChoice;
            // Espera a que la raíz aplique data-web-theme antes de leer los tokens.
            requestAnimationFrame(() => this.rebuild());
        });
    }

    scrollToPending(panel: HTMLElement): void {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        this.changeDetector.markForCheck();
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
