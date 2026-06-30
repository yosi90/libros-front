import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
        this.loadRequests();
        this.loadReviewReports();
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
}
