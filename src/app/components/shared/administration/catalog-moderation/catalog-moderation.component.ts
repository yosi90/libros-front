import { catalogEntityLabel, catalogRequestActionLabel, catalogRequestPayloadFields } from '../../../../shared/catalog-request-labels';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.Eager,
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
        return catalogRequestPayloadFields(request.Payload);
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
        return catalogRequestActionLabel(request);
    }

    entityLabel(entityType: string): string {
        return catalogEntityLabel(entityType);
    }



}
