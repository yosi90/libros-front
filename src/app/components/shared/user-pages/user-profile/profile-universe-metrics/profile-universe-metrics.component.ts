
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { UniverseMetricsResponse } from '../../../../../interfaces/universe';

@Component({
    standalone: true,
    selector: 'app-profile-universe-metrics',
    imports: [MatIconModule],
    templateUrl: './profile-universe-metrics.component.html',
    styleUrl: './profile-universe-metrics.component.sass'
})
export class ProfileUniverseMetricsComponent {
    @Input() metrics: UniverseMetricsResponse | null = null;
    @Input() loading = true;
    @Input() loadError = false;
    @Output() retry = new EventEmitter<void>();

    isEmpty(): boolean {
        if (!this.metrics)
            return true;

        const summary = this.metrics.Resumen;
        return summary.Libros.Total === 0
            && summary.Antologias.Total === 0
            && summary.Secciones.Total === 0
            && (summary.TotalCapitulos ?? 0) === 0
            && (summary.TotalCapitulosInterludio ?? 0) === 0
            && (summary.TotalPersonajes ?? 0) === 0
            && this.metrics.ComprasUltimosMeses.length === 0;
    }

    inProgressTotal(): number {
        if (!this.metrics)
            return 0;
        return this.metrics.Resumen.Libros.EnMarcha + this.metrics.Resumen.Antologias.EnMarcha;
    }

    chapterTotal(): number {
        if (!this.metrics)
            return 0;
        return (this.metrics.Resumen.TotalCapitulos ?? 0) + (this.metrics.Resumen.TotalCapitulosInterludio ?? 0);
    }

    durationLabel(): string {
        const duration = this.metrics?.LibroMasRapido?.TiempoLectura;
        if (!duration)
            return 'Sin lecturas completadas';
        return duration.Dias > 0 ? `${duration.Dias} d · ${duration.Horas} h` : `${duration.HorasTotales} h`;
    }

    monthLabel(year: number, month: number): string {
        const label = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '');
        return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
    }
}
