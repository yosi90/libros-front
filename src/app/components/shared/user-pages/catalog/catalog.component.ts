import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Observable, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../../environment/environment';
import {
    CatalogOption,
    CatalogEntityType,
    CatalogItem,
    CatalogOwnCollection,
    CatalogPublicDetail,
    CatalogPublicReview,
    CatalogPublicStats,
    CatalogQuery,
    CatalogRequestAction
} from '../../../../interfaces/catalog';
import { Universe } from '../../../../interfaces/universe';
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
import { CollectionStateModalComponent } from '../../common/collection-state-modal/collection-state-modal.component';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';

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
        MatMenuModule,
        MatSelectModule,
        MatTooltipModule,
        CollectionStateModalComponent,
        CoverCachePipe,
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
    isLoading = false;
    isSavingCollection = false;
    isSendingRequest = false;
    isLoadingPublicDetail = false;
    publicDetailLoadFailed = false;

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
    selectedCollectionReview = '';
    private selectedCollectionOriginalReview = '';
    selectedDetailItem: CatalogItem | null = null;
    selectedPublicDetail: CatalogPublicDetail | null = null;
    publicReviewPage = 0;
    expandedOwnReview = false;
    expandedPublicReviews = new Set<string>();

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
    }

    get canSubmitCollection(): boolean {
        return !!this.selectedCollectionItem && this.selectedCollectionStatus !== null && !this.isSavingCollection;
    }

    get collectionModalTitle(): string {
        return this.selectedCollectionItem
            ? `Actualizando ${this.selectedCollectionItem.Nombre}`
            : 'Actualizando lectura';
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
        this.selectedCollectionStatus = getLatestStatus(item.Estados)?.EstadoId ?? null;
        this.selectedCollectionRating = item.Puntuacion ?? null;
        this.selectedCollectionReview = item.Resena ?? '';
        this.selectedCollectionOriginalReview = this.selectedCollectionReview;
    }

    addToCollectionWithStatus(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void {
        event?.stopPropagation();
        if (this.isSavingCollection)
            return;

        this.isSavingCollection = true;
        const request = item.Tipo === 'libro'
            ? this.collectionSrv.updateBookStatus(item.Id, { EstadoId: statusId })
            : this.collectionSrv.updateAnthologyStatus(item.Id, { EstadoId: statusId });

        request.pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.applyStatusToCatalogItem(item, statusId, this.findCollectionCatalogItem(universes, item));
                this.snackBar.openSnackBar('Añadido a tu biblioteca', 'successBar');
            },
            error: () => {
                this.snackBar.openSnackBar('Error al añadir a tu biblioteca', 'errorBar');
                this.isSavingCollection = false;
            },
            complete: () => {
                this.isSavingCollection = false;
            }
        });
    }

    closeCollectionModal(): void {
        this.selectedCollectionItem = null;
        this.selectedCollectionStatus = null;
        this.selectedCollectionRating = null;
        this.selectedCollectionReview = '';
        this.selectedCollectionOriginalReview = '';
    }

    setCollectionRating(rating: number | null): void {
        this.selectedCollectionRating = rating;
        if (rating === null)
            this.selectedCollectionReview = '';
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
                ? this.collectionSrv.updateBookRating(item.Id, {
                    Puntuacion: this.selectedCollectionRating,
                    Resena: this.reviewPayloadValue()
                })
                : this.collectionSrv.updateAnthologyRating(item.Id, {
                    Puntuacion: this.selectedCollectionRating,
                    Resena: this.reviewPayloadValue()
                });
            requests.push(ratingRequest);
        }

        forkJoin(requests).pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
                this.syncSelectedDetailFromCollectionModal();
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
        this.resetReviewDisplayState();
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
        this.resetReviewDisplayState();
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

    openNewRequest(entityType: 'libro' | 'antologia'): void {
        this.requestEntityType = entityType;
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

    requestModalTitle(): string {
        if (this.requestAction === 'edicion')
            return `Proponer corrección de ${this.requestEntityLabel().toLocaleLowerCase()}`;

        return this.requestEntityType === 'antologia'
            ? 'Pedir nueva antología'
            : 'Pedir nuevo libro';
    }

    requestEntityLabel(): string {
        return this.requestEntityType === 'antologia' ? 'Antología' : 'Libro';
    }

    requestActionLabel(): string {
        return this.requestAction === 'edicion' ? 'Corrección de ficha' : 'Alta en catálogo';
    }

    requestNameLabel(): string {
        return this.requestAction === 'edicion' ? 'Nombre correcto' : 'Nombre';
    }

    requestIsbnLabel(): string {
        return this.requestAction === 'edicion' ? 'ISBN correcto' : 'ISBN';
    }

    requestCommentLabel(): string {
        return this.requestAction === 'edicion'
            ? 'Coméntanos qué deberíamos cambiar'
            : 'Nota con más detalles';
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

    isInCollection(item: CatalogItem): boolean {
        return (item.Estados?.length ?? 0) > 0 ||
            item.Puntuacion !== null && item.Puntuacion !== undefined ||
            !!item.Resena;
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
        return this.catalogOptionsLabel(item.Estilos?.slice(0, 1));
    }

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }

    publicDetailTitle(): string {
        return this.selectedPublicDetail?.Nombre ?? this.selectedDetailItem?.Nombre ?? '';
    }

    publicDetailCoverName(): string | null {
        return this.selectedPublicDetail?.Portada ?? this.selectedDetailItem?.Portada ?? null;
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
                !!ownCollection.Resena ||
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
            return this.selectedPublicDetail.MiColeccion.Puntuacion ?? this.selectedPublicDetail.Puntuacion ?? this.selectedDetailItem?.Puntuacion ?? null;

        return this.selectedDetailItem?.Puntuacion ?? null;
    }

    publicDetailPersonalReview(): string {
        if (this.selectedPublicDetail?.MiColeccion)
            return this.selectedPublicDetail.MiColeccion.Resena ?? this.selectedPublicDetail.Resena ?? this.selectedDetailItem?.Resena ?? '';

        return this.selectedDetailItem?.Resena ?? '';
    }

    publicDetailPersonalReviewHidden(): boolean {
        if (this.selectedPublicDetail?.MiColeccion)
            return this.selectedPublicDetail.MiColeccion.ResenaOculta ?? false;

        return this.selectedDetailItem?.ResenaOculta ?? false;
    }

    publicDetailHasPersonalReview(): boolean {
        return !!this.publicDetailPersonalReview().trim() && !this.publicDetailPersonalReviewHidden();
    }

    ratingStarValues(): number[] {
        return this.ratingOptions;
    }

    publicReviewRows(): CatalogPublicReview[] {
        const detail = this.selectedPublicDetail;
        if (!detail)
            return [];

        const aliases: Array<CatalogPublicReview[] | undefined> = [
            detail.Resenas,
            detail.ResenasPublicas,
            detail.ResenasVisibles,
            (detail as unknown as Record<string, CatalogPublicReview[] | undefined>)['Reseñas'],
            (detail as unknown as Record<string, CatalogPublicReview[] | undefined>)['ReseñasPublicas']
        ];
        const personalReview = this.publicDetailPersonalReview().trim();

        const reviews = aliases.find((candidate): candidate is CatalogPublicReview[] => Array.isArray(candidate)) ?? [];

        return reviews.filter(review => {
            const reviewText = review.Resena?.trim() ?? '';
            if (!reviewText || review.ResenaOculta)
                return false;
            if (review.EsMia || review.EsPropia)
                return false;
            return !personalReview || reviewText !== personalReview;
        });
    }

    pagedPublicReviewRows(): CatalogPublicReview[] {
        const start = this.publicReviewPage * 3;
        return this.publicReviewRows().slice(start, start + 3);
    }

    publicReviewTotalPages(): number {
        return Math.max(1, Math.ceil(this.publicReviewRows().length / 3));
    }

    hasPublicReviewPages(): boolean {
        return this.publicReviewRows().length > 3;
    }

    nextPublicReviewPage(): void {
        this.publicReviewPage = Math.min(this.publicReviewPage + 1, this.publicReviewTotalPages() - 1);
        this.expandedPublicReviews.clear();
    }

    previousPublicReviewPage(): void {
        this.publicReviewPage = Math.max(this.publicReviewPage - 1, 0);
        this.expandedPublicReviews.clear();
    }

    publicReviewAuthorLabel(review: CatalogPublicReview): string {
        return review.Usuario?.Nombre || 'Usuario';
    }

    publicReviewAuthorHandle(review: CatalogPublicReview): string {
        return this.toUserHandle(this.publicReviewAuthorLabel(review));
    }

    publicOwnReviewAuthorHandle(): string {
        return this.toUserHandle(this.sessionSrv.username ?? this.sessionSrv.displayName ?? (this.sessionSrv.userName || 'Usuario'));
    }

    publicReviewDate(review: CatalogPublicReview): string | null {
        return review.Fecha ?? review.FechaCreacion ?? null;
    }

    reviewTextNeedsToggle(text: string | null | undefined): boolean {
        return (text?.trim().length ?? 0) > 180;
    }

    publicReviewKey(review: CatalogPublicReview, index: number): string {
        return String(review.Id ?? `${this.publicReviewPage}-${index}-${review.UsuarioId ?? review.Usuario?.Id ?? 'anonimo'}`);
    }

    isPublicReviewExpanded(review: CatalogPublicReview, index: number): boolean {
        return this.expandedPublicReviews.has(this.publicReviewKey(review, index));
    }

    togglePublicReview(review: CatalogPublicReview, index: number): void {
        const key = this.publicReviewKey(review, index);
        if (this.expandedPublicReviews.has(key)) {
            this.expandedPublicReviews.delete(key);
            return;
        }

        this.expandedPublicReviews.add(key);
    }

    toggleOwnReview(): void {
        this.expandedOwnReview = !this.expandedOwnReview;
    }

    openReviewFromDetail(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.selectedDetailItem)
            return;

        this.openCollectionModal(this.selectedDetailItem, event);
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
            Puntuacion: detail.MiColeccion.Puntuacion ?? detail.Puntuacion ?? this.selectedDetailItem.Puntuacion ?? null,
            Resena: detail.MiColeccion.Resena ?? detail.Resena ?? this.selectedDetailItem.Resena ?? null,
            ResenaOculta: detail.MiColeccion.ResenaOculta ?? false,
            PuedeAbrirNarrativa: detail.MiColeccion.PuedeAbrirNarrativa ?? detail.PuedeAbrirNarrativa ?? this.selectedDetailItem.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: detail.MiColeccion.NarrativaPersonalDisponible ?? detail.NarrativaPersonalDisponible ?? this.selectedDetailItem.NarrativaPersonalDisponible
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

    private toUserHandle(name: string): string {
        const trimmed = name.trim() || 'Usuario';
        return '@' + trimmed.replace(/^@+/, '').replace(/\s+/g, '');
    }

    private resetReviewDisplayState(): void {
        this.publicReviewPage = 0;
        this.expandedOwnReview = false;
        this.expandedPublicReviews.clear();
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

    private reviewPayloadValue(): string | null {
        const review = this.selectedCollectionReview.trim();
        return review ? review : null;
    }

    private hasReviewChanged(): boolean {
        return this.selectedCollectionReview.trim() !== this.selectedCollectionOriginalReview.trim();
    }

    private syncSelectedDetailFromCollectionModal(): void {
        if (!this.selectedDetailItem || !this.selectedCollectionItem)
            return;
        if (this.selectedDetailItem.Tipo !== this.selectedCollectionItem.Tipo || this.selectedDetailItem.Id !== this.selectedCollectionItem.Id)
            return;

        const selectedStatus = this.statusOptions.find(status => status.Id === this.selectedCollectionStatus);
        const updatedStatuses = selectedStatus
            ? [{ Id: selectedStatus.Id, EstadoId: selectedStatus.Id, Nombre: selectedStatus.Nombre, Fecha: new Date().toISOString() }]
            : this.selectedDetailItem.Estados;
        const review = this.reviewPayloadValue();

        this.selectedDetailItem = {
            ...this.selectedDetailItem,
            Estados: updatedStatuses,
            Puntuacion: this.selectedCollectionRating,
            Resena: review,
            ResenaOculta: false,
            PuedeAbrirNarrativa: this.selectedDetailItem.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: this.selectedDetailItem.NarrativaPersonalDisponible
        };

        if (this.selectedPublicDetail) {
            this.selectedPublicDetail = {
                ...this.selectedPublicDetail,
                Puntuacion: this.selectedCollectionRating,
                Resena: review,
                ResenaOculta: false,
                MiColeccion: {
                    EnBiblioteca: true,
                    EstadoActual: updatedStatuses[updatedStatuses.length - 1] ?? null,
                    Estados: updatedStatuses,
                    Puntuacion: this.selectedCollectionRating,
                    Resena: review,
                    ResenaOculta: false,
                    PuedeAbrirNarrativa: this.selectedDetailItem.PuedeAbrirNarrativa,
                    NarrativaPersonalDisponible: this.selectedDetailItem.NarrativaPersonalDisponible,
                    FechaAgregado: this.selectedPublicDetail.MiColeccion?.FechaAgregado ?? null,
                    FechaActualizacion: new Date().toISOString()
                }
            };
        }
    }

    private applyStatusToCatalogItem(item: CatalogItem, statusId: ReadingStatusId, collectionItem?: CatalogItem): void {
        const selectedStatus = this.statusOptions.find(status => status.Id === statusId);
        if (!selectedStatus)
            return;

        const updatedStatuses = [{ Id: selectedStatus.Id, EstadoId: selectedStatus.Id, Nombre: selectedStatus.Nombre, Fecha: new Date().toISOString() }];
        const updatedItem: CatalogItem = {
            ...item,
            ...collectionItem,
            Estados: collectionItem?.Estados?.length ? collectionItem.Estados : updatedStatuses,
            PuedeAbrirNarrativa: collectionItem?.PuedeAbrirNarrativa ?? item.PuedeAbrirNarrativa ?? false,
            NarrativaPersonalDisponible: collectionItem?.NarrativaPersonalDisponible ?? item.NarrativaPersonalDisponible ?? false
        };

        this.items = this.items.map(candidate =>
            candidate.Tipo === item.Tipo && candidate.Id === item.Id ? updatedItem : candidate
        );

        if (this.selectedDetailItem?.Tipo === item.Tipo && this.selectedDetailItem.Id === item.Id)
            this.selectedDetailItem = updatedItem;
        if (this.selectedPublicDetail?.Id === item.Id)
            this.selectedPublicDetail = {
                ...this.selectedPublicDetail,
                MiColeccion: {
                    EnBiblioteca: true,
                    EstadoActual: updatedStatuses[updatedStatuses.length - 1],
                    Estados: updatedStatuses,
                    Puntuacion: this.selectedPublicDetail.MiColeccion?.Puntuacion ?? this.selectedPublicDetail.Puntuacion ?? null,
                    Resena: this.selectedPublicDetail.MiColeccion?.Resena ?? this.selectedPublicDetail.Resena ?? null,
                    ResenaOculta: this.selectedPublicDetail.MiColeccion?.ResenaOculta ?? false,
                    PuedeAbrirNarrativa: updatedItem.PuedeAbrirNarrativa,
                    NarrativaPersonalDisponible: updatedItem.NarrativaPersonalDisponible,
                    FechaAgregado: this.selectedPublicDetail.MiColeccion?.FechaAgregado ?? new Date().toISOString(),
                    FechaActualizacion: new Date().toISOString()
                }
            };
    }

    private findCollectionCatalogItem(universes: Universe[], target: CatalogItem): CatalogItem | undefined {
        for (const universe of universes) {
            const directItem = this.findCatalogItemInLists(target, universe.Libros, universe.Antologias);
            if (directItem)
                return directItem;

            for (const saga of universe.Sagas ?? []) {
                const sagaItem = this.findCatalogItemInLists(target, saga.Libros, saga.Antologias);
                if (sagaItem)
                    return sagaItem;
            }
        }

        return undefined;
    }

    private findCatalogItemInLists(
        target: CatalogItem,
        books: unknown[] = [],
        anthologies: unknown[] = []
    ): CatalogItem | undefined {
        const candidates = target.Tipo === 'libro' ? books : anthologies;
        const candidate = candidates.find(row => this.hasCatalogId(row, target.Id)) as Partial<CatalogItem> | undefined;
        return candidate
            ? {
                ...target,
                ...candidate,
                Tipo: target.Tipo,
                Estados: candidate.Estados ?? target.Estados ?? [],
                Autores: candidate.Autores ?? target.Autores ?? []
            }
            : undefined;
    }

    private hasCatalogId(row: unknown, id: number): row is { Id: number } {
        return typeof row === 'object' && row !== null && (row as { Id?: unknown }).Id === id;
    }
}
