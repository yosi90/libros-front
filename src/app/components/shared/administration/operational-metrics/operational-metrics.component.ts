import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OperationalMetrics } from '../../../../interfaces/community-capabilities';
import { ModerationService } from '../../../../services/entities/moderation.service';

@Component({
    standalone: true,
    selector: 'app-operational-metrics',
    imports: [CommonModule, MatIconModule],
    templateUrl: './operational-metrics.component.html',
    styleUrl: './operational-metrics.component.sass'
})
export class OperationalMetricsComponent implements OnInit {
    metrics: OperationalMetrics | null = null;
    loading = true;
    error = '';
    hours = 24;

    constructor(private moderation: ModerationService) { }
    ngOnInit(): void { this.load(); }

    load(): void {
        this.loading = true;
        this.error = '';
        this.moderation.getOperationalMetrics(this.hours).subscribe({
            next: metrics => { this.metrics = metrics; this.loading = false; },
            error: () => { this.error = 'No se han podido cargar las métricas operativas.'; this.loading = false; }
        });
    }

    setHours(hours: number): void { this.hours = hours; this.load(); }
}
