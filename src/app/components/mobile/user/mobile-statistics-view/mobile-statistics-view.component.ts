import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StatRowsComponent } from '../../../shared/common/stat-rows/stat-rows.component';
import { StatRow } from '../../../../shared/library-stats';
import type { StatisticsComponent } from '../../../shared/user-pages/statistics/statistics.component';

@Component({
    selector: 'app-mobile-statistics-view',
    standalone: true,
    imports: [MatIconModule, StatRowsComponent],
    templateUrl: './mobile-statistics-view.component.html',
    styleUrl: './mobile-statistics-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileStatisticsViewComponent {
    @Input({ required: true }) controller!: StatisticsComponent;

    get statusRows(): Array<{ label: string; value: number; percent: number }> {
        const values = this.controller.chartOptions.series as number[];
        const total = values.reduce((sum, value) => sum + value, 0);
        return this.controller.chartOptions.labels.map((label, index) => ({
            label,
            value: values[index] ?? 0,
            percent: total ? Math.round(((values[index] ?? 0) / total) * 100) : 0
        })).filter(row => row.value > 0);
    }

    get fastestRows(): StatRow[] {
        const values = this.controller.fastestReadBooksChartOptions.series[0]?.data ?? [];
        const labels = (this.controller.fastestReadBooksChartOptions.xaxis.categories ?? []) as unknown[];
        return labels.map((label, index) => {
            const value = Number(values[index] ?? 0);
            return { label: String(label), value, detail: `${value.toFixed(1)} días` };
        }).filter(row => row.value > 0);
    }
}
