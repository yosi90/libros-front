import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StatRow } from '../../../../shared/library-stats';

/**
 * Ranking o reparto como barras horizontales ligeras (Mobile/APK y Wood). La Web
 * dibuja los mismos datos con ApexCharts.
 */
@Component({
    selector: 'app-stat-rows',
    standalone: true,
    template: `
        @if (rows.length) {
          <ol class="rows" [class.rows--ranked]="ranked">
            @for (row of rows; track row.label; let index = $index) {
              <li>
                @if (ranked) {<span class="rows__rank">{{index + 1}}</span>}
                <div class="rows__body">
                  <div class="rows__head"><span>{{row.label}}</span><strong>{{row.detail || row.value}}</strong></div>
                  <div class="rows__track" aria-hidden="true"><span [style.width.%]="percent(row)"></span></div>
                </div>
              </li>
            }
          </ol>
        } @else {
          <p class="rows__empty">{{empty}}</p>
        }
    `,
    styleUrl: './stat-rows.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatRowsComponent {
    @Input() rows: StatRow[] = [];
    @Input() ranked = false;
    @Input() empty = 'Sin datos suficientes.';

    percent(row: StatRow): number {
        const max = Math.max(...this.rows.map(item => item.value), 1);
        return Math.max(4, Math.round((row.value / max) * 100));
    }
}
