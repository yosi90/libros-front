import { catalogEntityLabel, catalogRequestActionLabel, catalogRequestPayloadFields } from '../../../../shared/catalog-request-labels';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { forkJoin, of, Subscription, switchMap, map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
    CatalogRequest,
    CatalogItem,
    Edition,
    CatalogRequestResolve,
    ReportGroup,
    ReportResolve
} from '../../../../interfaces/catalog';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { ReportService } from '../../../../services/entities/report.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { SessionService } from '../../../../services/auth/session.service';
import { LibrarySyncService } from '../../../../services/stores/library-sync.service';
import { normalizeIsbn } from '../../../../shared/isbn';

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
export class CatalogModerationComponent implements OnInit, OnDestroy {
    @Input() view: ModerationView = 'all';

    requests: CatalogRequest[] = [];
    requestFields: Record<number, DisplayField[]> = {};
    reviewReports: ReportGroup[] = [];
    reportFields: Record<number, DisplayField[]> = {};
    isResolvingRequest = false;
    isResolvingReport = false;
    resolutionComment = '';
    reportResolutionComment = '';
    pendingGroupResolution: { requestId: number; Estado: CatalogRequestResolve['Estado'] } | null = null;
    editorialRequestId: number | null = null;
    workQuery = '';
    workResults: CatalogItem[] = [];
    selectedWork: CatalogItem | null = null;
    sharedEditions: { edition: Edition; workName: string }[] = [];
    selectedSharedEdition: Edition | null = null;
    isSearchingWork = false;
    private searchSubscription?: Subscription;

    constructor(
        private catalogRequestSrv: CatalogRequestService,
        private reportSrv: ReportService,
        private snackBar: SnackbarModule,
        private catalog: CatalogService,
        private session: SessionService,
        private librarySync: LibrarySyncService
    ) { }

    ngOnDestroy(): void { this.searchSubscription?.unsubscribe(); }

    canChooseExistingWork(request: CatalogRequest): boolean {
        return request.Accion === 'alta' && (request.TipoEntidad === 'libro' || request.TipoEntidad === 'antologia');
    }

    get canLinkSharedEdition(): boolean { return this.session.isAdmin; }

    openExistingWork(request: CatalogRequest): void {
        this.searchSubscription?.unsubscribe();
        this.pendingGroupResolution = null;
        this.editorialRequestId = request.Id;
        this.workQuery = '';
        this.workResults = [];
        this.selectedWork = null;
        this.sharedEditions = [];
        this.selectedSharedEdition = null;
        this.isSearchingWork = false;
    }

    cancelExistingWork(): void {
        this.searchSubscription?.unsubscribe();
        this.editorialRequestId = null;
        this.pendingGroupResolution = null;
        this.isSearchingWork = false;
    }

    searchWorks(request: CatalogRequest): void {
        const q = this.workQuery.trim();
        if (!q || this.isResolvingRequest || this.pendingGroupResolution)
            return;
        this.searchSubscription?.unsubscribe();
        this.isSearchingWork = true;
        this.workResults = [];
        this.selectedWork = null;
        this.selectedSharedEdition = null;
        this.sharedEditions = [];
        this.searchSubscription = (request.TipoEntidad === 'libro'
            ? this.catalog.getBooks({ q }) : this.catalog.getAnthologies({ q })).subscribe({
            next: works => { this.workResults = works; this.isSearchingWork = false; },
            error: error => {
                this.isSearchingWork = false;
                this.snackBar.openApiError(error, 'Error al buscar la obra');
            }
        });
    }

    findSharedEditions(request: CatalogRequest): void {
        if (!this.canLinkSharedEdition || !this.selectedWork || this.pendingGroupResolution || this.isResolvingRequest)
            return;
        const isbn = normalizeIsbn(String(request.ISBN ?? request.Payload['ISBN'] ?? ''));
        if (!isbn)
            return;
        this.searchSubscription?.unsubscribe();
        this.isSearchingWork = true;
        this.sharedEditions = [];
        this.selectedSharedEdition = null;
        this.searchSubscription = forkJoin([
            this.catalog.getBooks({ q: isbn }), this.catalog.getAnthologies({ q: isbn })
        ]).pipe(
            switchMap(results => {
                const works = results.flat();
                return works.length ? forkJoin(works.map(work => (work.Tipo === 'libro'
                    ? this.catalog.getBookEditions(work.Id) : this.catalog.getAnthologyEditions(work.Id))
                    .pipe(map(result => result.Ediciones.filter(edition => normalizeIsbn(edition.ISBN ?? '') === isbn)
                        .map(edition => ({ edition, workName: work.Nombre })))))) : of([]);
            }),
            map(results => [...new Map(results.flat().map(item => [item.edition.Id, item])).values()])
        ).subscribe({
            next: editions => { this.sharedEditions = editions; this.isSearchingWork = false; },
            error: error => {
                this.isSearchingWork = false;
                this.snackBar.openApiError(error, 'Error al consultar las ediciones del ISBN');
            }
        });
    }

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
            next: requests => {
                this.requests = requests;
                this.pendingGroupResolution = null;
                this.cancelExistingWork();
                this.requestFields = Object.fromEntries(requests.map(request =>
                    [request.Id, catalogRequestPayloadFields(request.Payload)]));
            },
            error: () => { this.requests = []; this.requestFields = {}; }
        });
    }

    prepareRequestResolution(request: CatalogRequest, Estado: CatalogRequestResolve['Estado']): void {
        if (this.isResolvingRequest)
            return;
        if (Estado === 'aprobada' && this.editorialRequestId === request.Id && !this.selectedWork)
            return;
        if ((request.Participantes ?? 1) > 1 || (Estado === 'aprobada' && this.editorialRequestId === request.Id)) {
            this.pendingGroupResolution = { requestId: request.Id, Estado };
            return;
        }
        this.resolveRequest(request, Estado);
    }

    confirmGroupResolution(request: CatalogRequest): void {
        const pending = this.pendingGroupResolution;
        if (!pending || pending.requestId !== request.Id)
            return;
        this.pendingGroupResolution = null;
        this.resolveRequest(request, pending.Estado);
    }

    resolveRequest(request: CatalogRequest, Estado: CatalogRequestResolve['Estado']): void {
        this.isResolvingRequest = true;
        this.catalogRequestSrv.resolve(request.Id, {
            Estado,
            Comentario: this.resolutionComment.trim() || null,
            ...(Estado === 'aprobada' && this.editorialRequestId === request.Id && this.selectedWork ? {
                Obra: { ObraId: this.selectedWork.Id,
                    ...(this.canLinkSharedEdition && this.selectedSharedEdition ? { VincularEdicionId: this.selectedSharedEdition.Id } : {}) }
            } : {})
        }).subscribe({
            next: result => {
                if (Estado === 'aprobada')
                    this.librarySync.refreshAfterCatalogChange();
                this.snackBar.openSnackBar(result.ParticipantesResueltos && result.ParticipantesResueltos > 1
                    ? `Petición resuelta para ${result.ParticipantesResueltos} participantes`
                    : 'Petición resuelta', 'successBar');
                this.resolutionComment = '';
                this.loadRequests();
            },
            error: error => {
                this.snackBar.openApiError(error, 'Error al resolver la petición');
                this.isResolvingRequest = false;
            },
            complete: () => {
                this.isResolvingRequest = false;
            }
        });
    }

    loadReviewReports(): void {
        this.reportSrv.list('pendiente').subscribe({
            next: reports => {
                this.reviewReports = reports;
                this.reportFields = Object.fromEntries(reports.map(report =>
                    [report.Id, this.buildReportReasonFields(report)]));
            },
            error: () => { this.reviewReports = []; this.reportFields = {}; }
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

    private buildReportReasonFields(report: ReportGroup): DisplayField[] {
        return (report.Reportes ?? []).map((item, index) => ({
            label: item.Usuario?.Nombre ? `Reporte ${index + 1} · ${item.Usuario.Nombre}` : `Reporte ${index + 1}`,
            value: [item.Motivo, item.FechaCreacion].filter(Boolean).join(' · ')
        }));
    }

    requestActionLabel(request: CatalogRequest): string {
        return catalogRequestActionLabel(request);
    }

    entityLabel(entityType: string): string {
        return catalogEntityLabel(entityType);
    }



}
