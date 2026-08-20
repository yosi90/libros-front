import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OperationalMetrics } from '../../../../interfaces/community-capabilities';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { ApiHealthService, RealtimeHealth, RealtimeHealthIssue, RealtimeOutboxCounters } from '../../../../services/other/api-health.service';

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
    realtimeHealth: RealtimeHealth | null = null;
    realtimeLoading = true;
    realtimeError = '';
    hours = 24;

    constructor(private moderation: ModerationService, private apiHealth: ApiHealthService) { }
    ngOnInit(): void { this.reloadAll(); }

    reloadAll(): void {
        this.load();
        this.loadRealtimeHealth();
    }

    load(): void {
        this.loading = true;
        this.error = '';
        this.moderation.getOperationalMetrics(this.hours).subscribe({
            next: metrics => { this.metrics = metrics; this.loading = false; },
            error: () => { this.error = 'No se han podido cargar las métricas operativas.'; this.loading = false; }
        });
    }

    setHours(hours: number): void { this.hours = hours; this.load(); }

    loadRealtimeHealth(): void {
        this.realtimeLoading = true;
        this.realtimeError = '';
        this.apiHealth.getRealtimeHealth().subscribe({
            next: health => {
                this.realtimeHealth = health;
                this.realtimeLoading = false;
            },
            error: () => {
                this.realtimeError = 'No se ha podido cargar el diagnóstico realtime.';
                this.realtimeLoading = false;
            }
        });
    }

    issueLabel(issue: RealtimeHealthIssue): string {
        const labels: Record<RealtimeHealthIssue, string> = {
            realtime_outbox_dead_letters: 'Hay eventos realtime en la cola de errores.',
            firestore_outbox_dead_letters: 'Hay eventos de Firestore en la cola de errores.',
            nats_unreachable: 'NATS no es accesible desde la API.'
        };
        return labels[issue];
    }

    outboxState(counters: RealtimeOutboxCounters): 'healthy' | 'degraded' {
        return counters.deadLetters > 0 ? 'degraded' : 'healthy';
    }

    formatAge(seconds: number): string {
        if (seconds < 60) return `${seconds} s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
        return `${Math.floor(seconds / 86400)} d`;
    }
}
