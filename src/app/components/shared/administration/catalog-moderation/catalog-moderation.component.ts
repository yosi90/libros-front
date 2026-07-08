import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
    CatalogRequest,
    CatalogRequestResolve,
    ReportGroup,
    ReportResolve
} from '../../../../interfaces/catalog';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { ReportService } from '../../../../services/entities/report.service';

type ModerationView = 'all' | 'requests' | 'reports';

interface DisplayField {
    label: string;
    value: string;
}

@Component({
    standalone: true,
    selector: 'app-catalog-moderation',
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        SnackbarModule
    ],
    templateUrl: './catalog-moderation.component.html',
    styleUrl: './catalog-moderation.component.sass'
})
export class CatalogModerationComponent implements OnInit {
    @Input() view: ModerationView = 'all';

    requests: CatalogRequest[] = [];
    reviewReports: ReportGroup[] = [];
    isResolvingRequest = false;
    isResolvingReport = false;
    resolutionComment = '';
    reportResolutionComment = '';

    constructor(
        private catalogRequestSrv: CatalogRequestService,
        private reportSrv: ReportService,
        private snackBar: SnackbarModule
    ) { }

    ngOnInit(): void {
        if (this.showRequests())
            this.loadRequests();
        if (this.showReports())
            this.loadReviewReports();
    }

    showRequests(): boolean {
        return this.view === 'all' || this.view === 'requests';
    }

    showReports(): boolean {
        return this.view === 'all' || this.view === 'reports';
    }

    loadRequests(): void {
        this.catalogRequestSrv.list('pendiente').subscribe({
            next: requests => this.requests = requests,
            error: () => this.requests = []
        });
    }

    resolveRequest(request: CatalogRequest, Estado: CatalogRequestResolve['Estado']): void {
        this.isResolvingRequest = true;
        this.catalogRequestSrv.resolve(request.Id, {
            Estado,
            Comentario: this.resolutionComment.trim() || null
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Petición resuelta', 'successBar');
                this.resolutionComment = '';
                this.loadRequests();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al resolver la petición', 'errorBar');
                this.isResolvingRequest = false;
            },
            complete: () => {
                this.isResolvingRequest = false;
            }
        });
    }

    loadReviewReports(): void {
        this.reportSrv.list('pendiente').subscribe({
            next: reports => this.reviewReports = reports,
            error: () => this.reviewReports = []
        });
    }

    resolveReviewReport(report: ReportGroup, Estado: ReportResolve['Estado']): void {
        this.isResolvingReport = true;
        this.reportSrv.resolve(report.Id, {
            Estado,
            Comentario: this.reportResolutionComment.trim() || null
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Reporte resuelto', 'successBar');
                this.reportResolutionComment = '';
                this.loadReviewReports();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al resolver el reporte', 'errorBar');
                this.isResolvingReport = false;
            },
            complete: () => {
                this.isResolvingReport = false;
            }
        });
    }

    requestPayloadFields(request: CatalogRequest): DisplayField[] {
        return this.payloadFields(request.Payload);
    }

    reportReasonFields(report: ReportGroup): DisplayField[] {
        return (report.Reportes ?? []).map((item, index) => ({
            label: item.Usuario?.Nombre ? `Reporte ${index + 1} · ${item.Usuario.Nombre}` : `Reporte ${index + 1}`,
            value: [item.Motivo, item.FechaCreacion].filter(Boolean).join(' · ')
        }));
    }

    hasRequestPayload(request: CatalogRequest): boolean {
        return this.requestPayloadFields(request).length > 0;
    }

    hasReportReasons(report: ReportGroup): boolean {
        return this.reportReasonFields(report).length > 0;
    }

    requestActionLabel(request: CatalogRequest): string {
        return request.Accion === 'edicion' ? 'Corrección de ficha' : 'Alta en catálogo';
    }

    entityLabel(entityType: string): string {
        const labels: Record<string, string> = {
            autor: 'Autor',
            universo: 'Universo',
            saga: 'Saga',
            libro: 'Libro',
            antologia: 'Antología'
        };

        return labels[entityType] ?? entityType;
    }

    private payloadFields(payload: Record<string, unknown> | null | undefined): DisplayField[] {
        if (!payload)
            return [];

        return Object.entries(payload)
            .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
            .map(([key, value]) => ({
                label: this.payloadLabel(key),
                value: this.payloadValue(value)
            }));
    }

    private payloadLabel(key: string): string {
        const labels: Record<string, string> = {
            Nombre: 'Nombre',
            ISBN: 'ISBN',
            Paginas: 'Páginas',
            FechaPublicacion: 'Fecha de publicación',
            Comentario: 'Comentario del usuario'
        };

        return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    private payloadValue(value: unknown): string {
        if (Array.isArray(value))
            return value.map(item => this.payloadValue(item)).join(', ');

        if (typeof value === 'object' && value !== null)
            return Object.entries(value as Record<string, unknown>)
                .map(([key, nestedValue]) => `${this.payloadLabel(key)}: ${this.payloadValue(nestedValue)}`)
                .join(' · ');

        return String(value);
    }
}
