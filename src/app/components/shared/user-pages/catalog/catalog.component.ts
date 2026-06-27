import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Observable, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../../environment/environment';
import {
    CatalogOption,
    CatalogEntityType,
    CatalogItem,
    CatalogOwnCollection,
    CatalogPublicDetail,
    CatalogPublicStats,
    CatalogQuery,
    CatalogRequest,
    CatalogRequestAction,
    CatalogRequestResolve
} from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { SessionService } from '../../../../services/auth/session.service';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import {
    getLatestStatus,
    getLatestStatusName,
    getStatusClass,
    getStatusIcon,
    readingStatusOptions
} from '../../../../shared/reading-status';

type CatalogTypeFilter = 'todos' | 'libro' | 'antologia';

@Component({
    standalone: true,
    selector: 'app-catalog',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        SnackbarModule
    ],
    templateUrl: './catalog.component.html',
    styleUrl: './catalog.component.sass'
})
export class CatalogComponent implements OnInit {
    readonly imgUrl = environment.getImgUrl;
    readonly statusOptions = readingStatusOptions;
    readonly ratingOptions = [1, 2, 3, 4, 5];

    items: CatalogItem[] = [];
    languages: CatalogOption[] = [];
    styles: CatalogOption[] = [];
    requests: CatalogRequest[] = [];
    isLoading = false;
    isSavingCollection = false;
    isSendingRequest = false;
    isResolvingRequest = false;
    isLoadingPublicDetail = false;
    publicDetailLoadFailed = false;
    resolutionComment = '';

    filterType: CatalogTypeFilter = 'todos';
    query = '';
    selectedStatusFilter: ReadingStatusId | '' = '';
    selectedRatingFilter: number | '' = '';
    selectedLanguageFilter: number | '' = '';
    selectedStyleFilter: number | '' = '';
    draftQuery = '';
    searchTerms: string[] = [];
    isSearchSuggestionOpen = false;

    selectedCollectionItem: CatalogItem | null = null;
    selectedCollectionStatus: ReadingStatusId | null = null;
    selectedCollectionRating: number | null = null;
    selectedDetailItem: CatalogItem | null = null;
    selectedPublicDetail: CatalogPublicDetail | null = null;

    isRequestModalOpen = false;
    requestEntityType: CatalogEntityType = 'libro';
    requestAction: CatalogRequestAction = 'alta';
    requestEntityId: number | null = null;
    requestTargetName = '';
    requestSuggestedName = '';
    requestSuggestedIsbn = '';
    requestSuggestedPublicationDate = '';
    requestComment = '';

    constructor(
        private catalogSrv: CatalogService,
        private collectionSrv: CollectionService,
        private catalogRequestSrv: CatalogRequestService,
        private universeStore: UniverseStoreService,
        private sessionSrv: SessionService,
        private snackBar: SnackbarModule,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadMetadata();
        this.loadCatalog();
        this.loadRequests();
    }

    get canModerateCatalog(): boolean {
        return this.sessionSrv.canModerateCatalog;
    }

    get canSubmitCollection(): boolean {
        return !!this.selectedCollectionItem && this.selectedCollectionStatus !== null && !this.isSavingCollection;
    }

    loadCatalog(): void {
        this.isLoading = true;
        const query = this.getCatalogQuery();
        const requests: Observable<CatalogItem[]>[] = [];

        if (this.filterType === 'todos' || this.filterType === 'libro')
            requests.push(this.catalogSrv.getBooks(query));
        if (this.filterType === 'todos' || this.filterType === 'antologia')
            requests.push(this.catalogSrv.getAnthologies(query));

        forkJoin(requests).subscribe({
            next: results => {
                this.items = results.flat().sort((a, b) => a.Nombre.localeCompare(b.Nombre));
                this.isLoading = false;
            },
            error: () => {
                this.snackBar.openSnackBar('Error al cargar el catálogo', 'errorBar');
                this.isLoading = false;
            }
        });
    }

    loadMetadata(): void {
        forkJoin({
            languages: this.catalogSrv.getLanguages(),
            styles: this.catalogSrv.getStyles()
        }).subscribe({
            next: ({ languages, styles }) => {
                this.languages = languages;
                this.styles = styles;
            },
            error: () => {
                this.languages = [];
                this.styles = [];
            }
        });
    }

    clearFilters(): void {
        this.filterType = 'todos';
        this.query = '';
        this.draftQuery = '';
        this.searchTerms = [];
        this.isSearchSuggestionOpen = false;
        this.selectedStatusFilter = '';
        this.selectedRatingFilter = '';
        this.selectedLanguageFilter = '';
        this.selectedStyleFilter = '';
        this.loadCatalog();
    }

    onDraftQueryInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.draftQuery = target.value;
        this.isSearchSuggestionOpen = this.draftQuery.trim().length > 0;
    }

    commitDraftQuery(): void {
        const value = this.draftQuery.trim();
        if (!value)
            return;

        if (!this.searchTerms.includes(value))
            this.searchTerms = [...this.searchTerms, value];
        this.query = this.searchTerms.join(' ');
        this.draftQuery = '';
        this.isSearchSuggestionOpen = false;
        this.loadCatalog();
    }

    removeSearchTerm(term: string): void {
        this.searchTerms = this.searchTerms.filter(item => item !== term);
        this.query = this.searchTerms.join(' ');
        this.loadCatalog();
    }

    onSearchInputBlur(): void {
        window.setTimeout(() => {
            this.commitDraftQuery();
            this.isSearchSuggestionOpen = false;
        }, 120);
    }

    setTypeFilter(filterType: CatalogTypeFilter): void {
        this.filterType = filterType;
        this.loadCatalog();
    }

    applySelectFilters(): void {
        this.loadCatalog();
    }

    get hasActiveFilters(): boolean {
        return this.searchTerms.length > 0 ||
            this.draftQuery.trim().length > 0 ||
            this.filterType !== 'todos' ||
            this.selectedStatusFilter !== '' ||
            this.selectedRatingFilter !== '' ||
            this.selectedLanguageFilter !== '' ||
            this.selectedStyleFilter !== '';
    }

    openCollectionModal(item: CatalogItem, event?: MouseEvent): void {
        event?.stopPropagation();
        if (this.selectedDetailItem?.Tipo === item.Tipo && this.selectedDetailItem.Id === item.Id)
            this.closePublicDetailModal();
        this.selectedCollectionItem = item;
        this.selectedCollectionStatus = null;
        this.selectedCollectionRating = item.Puntuacion ?? null;
    }

    closeCollectionModal(): void {
        this.selectedCollectionItem = null;
        this.selectedCollectionStatus = null;
        this.selectedCollectionRating = null;
    }

    saveToCollection(): void {
        if (!this.selectedCollectionItem || this.selectedCollectionStatus === null) {
            this.snackBar.openSnackBar('Selecciona un estado de lectura', 'errorBar');
            return;
        }

        this.isSavingCollection = true;
        const item = this.selectedCollectionItem;
        const statusRequest = item.Tipo === 'libro'
            ? this.collectionSrv.updateBookStatus(item.Id, { EstadoId: this.selectedCollectionStatus })
            : this.collectionSrv.updateAnthologyStatus(item.Id, { EstadoId: this.selectedCollectionStatus });

        const requests: Observable<unknown>[] = [statusRequest];
        if (this.selectedCollectionRating !== null) {
            const ratingRequest = item.Tipo === 'libro'
                ? this.collectionSrv.updateBookRating(item.Id, { Puntuacion: this.selectedCollectionRating })
                : this.collectionSrv.updateAnthologyRating(item.Id, { Puntuacion: this.selectedCollectionRating });
            requests.push(ratingRequest);
        }

        forkJoin(requests).pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
                this.closeCollectionModal();
                this.loadCatalog();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al actualizar tu biblioteca', 'errorBar');
                this.isSavingCollection = false;
            },
            complete: () => {
                this.isSavingCollection = false;
            }
        });
    }

    openItem(item: CatalogItem): void {
        this.selectedDetailItem = item;
        this.selectedPublicDetail = null;
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = true;

        const request = item.Tipo === 'libro'
            ? this.catalogSrv.getBookPublicDetail(item.Id)
            : this.catalogSrv.getAnthologyPublicDetail(item.Id);

        request.subscribe({
            next: detail => {
                this.selectedPublicDetail = detail;
                this.applyOwnCollectionFromDetail(detail);
                this.isLoadingPublicDetail = false;
            },
            error: () => {
                this.publicDetailLoadFailed = true;
                this.isLoadingPublicDetail = false;
            }
        });
    }

    closePublicDetailModal(): void {
        this.selectedDetailItem = null;
        this.selectedPublicDetail = null;
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = false;
    }

    openReadingFromDetail(): void {
        if (!this.selectedDetailItem || this.selectedDetailItem.Tipo !== 'libro' || !this.isDetailInCollection())
            return;

        const bookId = this.selectedDetailItem.Id;
        this.closePublicDetailModal();
        this.router.navigate(['/book', bookId]);
    }

    openNewRequest(): void {
        this.requestEntityType = 'libro';
        this.requestAction = 'alta';
        this.requestEntityId = null;
        this.requestTargetName = '';
        this.requestSuggestedName = '';
        this.requestSuggestedIsbn = '';
        this.requestSuggestedPublicationDate = '';
        this.requestComment = '';
        this.isRequestModalOpen = true;
    }

    openCorrectionRequest(item: CatalogItem, event: MouseEvent): void {
        event.stopPropagation();
        this.requestEntityType = item.Tipo === 'libro' ? 'libro' : 'antologia';
        this.requestAction = 'edicion';
        this.requestEntityId = item.Id;
        this.requestTargetName = item.Nombre;
        this.requestSuggestedName = item.Nombre;
        this.requestSuggestedIsbn = item.ISBN ?? '';
        this.requestSuggestedPublicationDate = item.FechaPublicacion ?? '';
        this.requestComment = '';
        this.isRequestModalOpen = true;
    }

    closeRequestModal(): void {
        this.isRequestModalOpen = false;
    }

    submitRequest(): void {
        const payload = this.buildRequestPayload();
        if (Object.keys(payload).length === 0) {
            this.snackBar.openSnackBar('Indica al menos un dato o comentario para la petición', 'errorBar');
            return;
        }

        this.isSendingRequest = true;
        this.catalogRequestSrv.create({
            TipoEntidad: this.requestEntityType,
            Accion: this.requestAction,
            EntidadId: this.requestAction === 'edicion' ? this.requestEntityId : null,
            Payload: payload
        }).subscribe({
            next: () => {
                this.snackBar.openSnackBar('Petición enviada', 'successBar');
                this.closeRequestModal();
                this.loadRequests();
            },
            error: () => {
                this.snackBar.openSnackBar('Error al enviar la petición', 'errorBar');
                this.isSendingRequest = false;
            },
            complete: () => {
                this.isSendingRequest = false;
            }
        });
    }

    loadRequests(): void {
        if (!this.canModerateCatalog)
            return;

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
                this.loadCatalog();
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

    isInCollection(item: CatalogItem): boolean {
        return (item.Estados?.length ?? 0) > 0;
    }

    latestStatusName(item: CatalogItem): string {
        return getLatestStatusName(item.Estados);
    }

    statusClass(item: CatalogItem): string {
        return getStatusClass(getLatestStatus(item.Estados));
    }

    statusIcon(item: CatalogItem): string {
        return getStatusIcon(getLatestStatus(item.Estados));
    }

    authorsLabel(item: CatalogItem): string {
        return item.Autores?.map(author => author.Nombre).join(', ') || 'Sin autor';
    }

    languagesLabel(item: CatalogItem): string {
        return this.catalogOptionsLabel(item.IdiomasDisponibles);
    }

    stylesLabel(item: CatalogItem): string {
        return this.catalogOptionsLabel(item.Estilos);
    }

    coverUrl(item: CatalogItem): string {
        return item.Portada ? this.imgUrl + 'cover/' + item.Portada : 'assets/media/img/error.png';
    }

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }

    publicDetailTitle(): string {
        return this.selectedPublicDetail?.Nombre ?? this.selectedDetailItem?.Nombre ?? '';
    }

    publicDetailCoverUrl(): string {
        const cover = this.selectedPublicDetail?.Portada ?? this.selectedDetailItem?.Portada ?? null;
        return cover ? this.imgUrl + 'cover/' + cover : 'assets/media/img/error.png';
    }

    publicDetailAuthorsLabel(): string {
        const authors = this.selectedPublicDetail?.Autores ?? this.selectedDetailItem?.Autores ?? [];
        return authors.map(author => author.Nombre).join(', ') || 'Sin autor';
    }

    publicDetailLanguagesLabel(): string {
        return this.catalogOptionsLabel(this.selectedPublicDetail?.IdiomasDisponibles ?? this.selectedDetailItem?.IdiomasDisponibles);
    }

    publicDetailStylesLabel(): string {
        return this.catalogOptionsLabel(this.selectedPublicDetail?.Estilos ?? this.selectedDetailItem?.Estilos);
    }

    publicDetailAverageRatingLabel(): string {
        const stats = this.publicDetailStats();
        if (!stats || stats.PuntuacionMedia === null || stats.PuntuacionMedia === undefined)
            return 'Sin datos';

        return `${stats.PuntuacionMedia.toFixed(1)} (${this.formatStat(stats.TotalPuntuaciones)} puntuaciones)`;
    }

    publicDetailStats(): CatalogPublicStats | null {
        return this.selectedPublicDetail?.Estadisticas ?? null;
    }

    isDetailInCollection(): boolean {
        const ownCollection = this.selectedPublicDetail?.MiColeccion;
        if (ownCollection)
            return ownCollection.EnBiblioteca ||
                this.ownCollectionStatuses(ownCollection).length > 0 ||
                ownCollection.Puntuacion !== null && ownCollection.Puntuacion !== undefined ||
                !!ownCollection.FechaAgregado;

        return this.selectedDetailItem ? this.isInCollection(this.selectedDetailItem) : false;
    }

    publicDetailPersonalStatusName(): string {
        const ownCollection = this.selectedPublicDetail?.MiColeccion;
        const ownStatuses = this.ownCollectionStatuses(ownCollection);
        if (ownStatuses.length > 0)
            return getLatestStatusName(ownStatuses);

        return this.selectedDetailItem ? this.latestStatusName(this.selectedDetailItem) : '';
    }

    publicDetailPersonalRating(): number | null {
        if (this.selectedPublicDetail?.MiColeccion)
            return this.selectedPublicDetail.MiColeccion.Puntuacion ?? null;

        return this.selectedDetailItem?.Puntuacion ?? null;
    }

    ratingDistributionRows(): NonNullable<CatalogPublicStats['DistribucionPuntuaciones']> {
        return [...(this.selectedPublicDetail?.Estadisticas.DistribucionPuntuaciones ?? [])]
            .sort((a, b) => b.Puntuacion - a.Puntuacion);
    }

    stateDistributionRows(): NonNullable<CatalogPublicStats['DistribucionEstados']> {
        return [...(this.selectedPublicDetail?.Estadisticas.DistribucionEstados ?? [])]
            .sort((a, b) => b.Total - a.Total);
    }

    formatStat(value: number | null | undefined): string {
        return value === null || value === undefined ? 'Sin datos' : String(value);
    }

    formatAverageRating(value: number | null | undefined): string {
        return value === null || value === undefined ? 'Sin datos' : value.toFixed(1);
    }

    formatPercent(value: number | null | undefined): string {
        return value === null || value === undefined ? 'Sin datos' : `${value.toFixed(1)}%`;
    }

    formatRanking(metric: { Ranking?: number; TotalItems?: number } | null | undefined): string {
        if (!metric?.Ranking || !metric.TotalItems)
            return 'Sin datos';

        return `#${metric.Ranking} de ${metric.TotalItems}`;
    }

    private getCatalogQuery(): CatalogQuery {
        return {
            q: this.query.trim() || undefined,
            estadoId: this.selectedStatusFilter === '' ? undefined : this.selectedStatusFilter,
            puntuacionMin: this.selectedRatingFilter === '' ? undefined : this.selectedRatingFilter,
            idiomaId: this.selectedLanguageFilter === '' ? undefined : this.selectedLanguageFilter,
            estiloId: this.selectedStyleFilter === '' ? undefined : this.selectedStyleFilter
        };
    }

    private catalogOptionsLabel(options: CatalogOption[] | string[] | null | undefined): string {
        if (!options?.length)
            return '';

        return options
            .map(option => typeof option === 'string' ? option : option.Nombre)
            .filter(Boolean)
            .join(', ');
    }

    private applyOwnCollectionFromDetail(detail: CatalogPublicDetail): void {
        if (!this.selectedDetailItem || !detail.MiColeccion)
            return;

        const ownStatuses = this.ownCollectionStatuses(detail.MiColeccion);
        const updatedItem: CatalogItem = {
            ...this.selectedDetailItem,
            Estados: ownStatuses,
            Puntuacion: detail.MiColeccion.Puntuacion ?? null
        };

        this.selectedDetailItem = updatedItem;
        this.items = this.items.map(item =>
            item.Tipo === updatedItem.Tipo && item.Id === updatedItem.Id ? updatedItem : item
        );
    }

    private ownCollectionStatuses(ownCollection: CatalogOwnCollection | null | undefined) {
        if (!ownCollection)
            return [];

        if (ownCollection.Estados?.length)
            return ownCollection.Estados;

        return ownCollection.EstadoActual ? [ownCollection.EstadoActual] : [];
    }

    private buildRequestPayload(): Record<string, unknown> {
        const payload: Record<string, unknown> = {};
        const name = this.requestSuggestedName.trim();
        const isbn = this.requestSuggestedIsbn.trim();
        const publicationDate = this.requestSuggestedPublicationDate.trim();
        const comment = this.requestComment.trim();

        if (name)
            payload['Nombre'] = name;
        if (this.isBookLikeRequest() && isbn)
            payload['ISBN'] = isbn;
        if (this.isBookLikeRequest() && publicationDate)
            payload['FechaPublicacion'] = publicationDate;
        if (comment)
            payload['Comentario'] = comment;

        return payload;
    }

    private isBookLikeRequest(): boolean {
        return this.requestEntityType === 'libro' || this.requestEntityType === 'antologia';
    }
}
