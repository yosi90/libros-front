import { forkJoin, Subscription, switchMap } from 'rxjs';
import {
    CatalogItem,
    CatalogOption,
    CatalogOwnCollection,
    CatalogPublicDetail,
    CatalogPublicReview,
    CatalogPublicStats,
    Edition
} from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { ReportService } from '../../../../services/entities/report.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { getApiErrorCode, getApiErrorMessage } from '../../../../shared/api-error-message';
import { getApiErrorField } from '../../../../shared/backend-field-error';
import { ownedEditionIds, preferredEdition } from '../../../../shared/edition-selection';
import { getLatestStatus, getLatestStatusName, readingStatusOptions } from '../../../../shared/reading-status';
import { collectionStateRequests, CollectionStateValues } from '../../../../shared/collection-state';
import { catalogEntryText } from '../../../../shared/catalog-entry';
import { ratingEvolutionRows } from '../../../../shared/rating-history';
import { PublicDetailController } from './public-detail.model';

/**
 * Estado y acciones de la ficha pública de una obra y de su editor de estado,
 * puntuación y reseña. Lo comparten Catálogo y los gestores del Perfil; cada
 * container solo añade lo propio (su listado, sus avisos y su navegación).
 */
export abstract class PublicDetailHost implements PublicDetailController {
    readonly statusOptions = readingStatusOptions;
    readonly ratingOptions = [1, 2, 3, 4, 5];

    selectedDetailItem: CatalogItem | null = null;
    selectedPublicDetail: CatalogPublicDetail | null = null;
    selectedEditionId: number | null = null;
    isLoadingPublicDetail = false;
    publicDetailLoadFailed = false;
    isSavingEditions = false;
    editionSelectionError = '';
    publicReviewPage = 0;
    expandedOwnReview = false;
    expandedPublicReviews = new Set<string>();
    /** Reseñas denunciadas en esta visita (o en curso): no se ofrece denunciarlas otra vez. */
    reportedReviewKeys = new Set<string>();

    selectedCollectionItem: CatalogItem | null = null;
    selectedCollectionStatus: ReadingStatusId | null = null;
    selectedCollectionRating: number | null = null;
    selectedCollectionReview = '';
    excludeCollectionActivity = false;
    isSavingCollection = false;
    /** Lo que había al abrir el editor: solo se envía lo que cambia. */
    private collectionOriginal: CollectionStateValues = { status: null, rating: null, review: '' };

    private publicDetailRequest?: Subscription;

    protected constructor(
        protected catalogSrv: CatalogService,
        protected collectionSrv: CollectionService,
        protected universeStore: UniverseStoreService,
        protected sessionSrv: PlatformSessionService,
        protected snackBar: SnackbarModule,
        protected reportSrv?: ReportService
    ) { }

    abstract openReadingFromDetail(): void;
    /** Opcional: Catálogo permite añadir la obra con un estado sin abrir el editor. */
    addToCollectionWithStatus?(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void;

    get canSubmitCollection(): boolean {
        return !!this.selectedCollectionItem && this.selectedCollectionStatus !== null && !this.isSavingCollection;
    }

    get collectionModalTitle(): string {
        return this.selectedCollectionItem
            ? `Actualizando ${this.selectedCollectionItem.Nombre}`
            : 'Actualizando lectura';
    }

    /** Abre la ficha con lo que ya se sabe de la obra y la completa con su detalle público. */
    openItem(item: CatalogItem): void {
        this.selectedDetailItem = item;
        this.selectedPublicDetail = null;
        this.selectedEditionId = preferredEdition(item.Ediciones ?? [])?.Id ?? null;
        this.editionSelectionError = '';
        this.resetReviewDisplayState();
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = true;

        const request = item.Tipo === 'libro'
            ? this.catalogSrv.getBookPublicDetail(item.Id)
            : this.catalogSrv.getAnthologyPublicDetail(item.Id);

        this.publicDetailRequest?.unsubscribe();
        this.publicDetailRequest = request.subscribe({
            next: detail => {
                if (this.selectedDetailItem?.Id !== item.Id || this.selectedDetailItem.Tipo !== item.Tipo)
                    return;
                this.selectedPublicDetail = detail;
                this.selectedEditionId = preferredEdition(detail.Ediciones ?? item.Ediciones ?? [], detail.MiColeccion?.EdicionesIds)?.Id ?? null;
                this.applyOwnCollectionFromDetail(detail);
                this.isLoadingPublicDetail = false;
            },
            error: () => {
                if (this.selectedDetailItem?.Id !== item.Id || this.selectedDetailItem.Tipo !== item.Tipo)
                    return;
                this.publicDetailLoadFailed = true;
                this.isLoadingPublicDetail = false;
            }
        });
    }

    closePublicDetailModal(): void {
        this.selectedDetailItem = null;
        this.selectedPublicDetail = null;
        this.selectedEditionId = null;
        this.editionSelectionError = '';
        this.resetReviewDisplayState();
        this.publicDetailLoadFailed = false;
        this.isLoadingPublicDetail = false;
    }

    openCollectionModal(item: CatalogItem, event?: MouseEvent): void {
        event?.stopPropagation();
        this.selectedCollectionItem = item;
        this.selectedCollectionStatus = getLatestStatus(item.Estados)?.EstadoId ?? null;
        this.selectedCollectionRating = item.Puntuacion ?? null;
        this.selectedCollectionReview = item.Resena ?? '';
        this.excludeCollectionActivity = false;
        this.collectionOriginal = {
            status: this.selectedCollectionStatus,
            rating: this.selectedCollectionRating,
            review: this.selectedCollectionReview
        };
    }

    openReviewFromDetail(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.selectedDetailItem)
            return;

        this.openCollectionModal(this.selectedDetailItem, event);
    }

    closeCollectionModal(): void {
        this.selectedCollectionItem = null;
        this.selectedCollectionStatus = null;
        this.selectedCollectionRating = null;
        this.selectedCollectionReview = '';
        this.excludeCollectionActivity = false;
        this.collectionOriginal = { status: null, rating: null, review: '' };
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

        const item = this.selectedCollectionItem;
        const wasInCollection = this.isInCollection(item);
        const requests = collectionStateRequests(this.collectionSrv, item, {
            status: this.selectedCollectionStatus,
            rating: this.selectedCollectionRating,
            review: this.selectedCollectionReview
        }, this.collectionOriginal, this.excludeCollectionActivity);
        if (!Array.isArray(requests)) {
            this.snackBar.openSnackBar(requests.error, 'errorBar');
            return;
        }
        if (requests.length === 0) {
            this.closeCollectionModal();
            return;
        }

        this.isSavingCollection = true;
        forkJoin(requests).pipe(
            switchMap(() => this.collectionSrv.getUniverses())
        ).subscribe({
            next: universes => {
                this.universeStore.setUniverses(universes);
                this.announceCollectionSaved(item, wasInCollection);
                this.syncSelectedDetailFromCollectionModal();
                this.closeCollectionModal();
                this.afterCollectionSaved();
            },
            error: error => {
                this.snackBar.openApiError(error, 'Error al actualizar tu biblioteca');
                this.isSavingCollection = false;
            },
            complete: () => {
                this.isSavingCollection = false;
            }
        });
    }

    isInCollection(item: CatalogItem): boolean {
        return (item.Estados?.length ?? 0) > 0 ||
            !!item.Ediciones?.some(edition => edition.EnMiBiblioteca) ||
            item.Puntuacion !== null && item.Puntuacion !== undefined ||
            !!item.Resena;
    }

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }

    publicDetailTitle(): string {
        return this.selectedPublicDetail?.Nombre ?? this.selectedDetailItem?.Nombre ?? '';
    }

    publicDetailCoverName(): string | null {
        return this.selectedEdition()?.Portada ?? this.selectedPublicDetail?.Portada ?? this.selectedDetailItem?.Portada ?? null;
    }

    publicDetailEditions(): Edition[] {
        return this.selectedPublicDetail?.Ediciones ?? this.selectedDetailItem?.Ediciones ?? [];
    }

    selectedEdition(): Edition | null {
        return this.publicDetailEditions().find(edition => edition.Id === this.selectedEditionId)
            ?? preferredEdition(this.publicDetailEditions(), this.selectedPublicDetail?.MiColeccion?.EdicionesIds);
    }

    selectEdition(editionId: number): void {
        if (this.publicDetailEditions().some(edition => edition.Id === editionId)) {
            this.selectedEditionId = editionId;
            this.editionSelectionError = '';
        }
    }

    publicDetailIsbn(): string | null {
        return this.selectedEdition()?.ISBN ?? (this.publicDetailEditions().length ? null : this.selectedPublicDetail?.ISBN ?? this.selectedDetailItem?.ISBN ?? null);
    }

    /** Cuándo entró la obra en el catálogo, para la ficha; vacío si no se sabe. */
    publicDetailCatalogEntry(): string {
        const work = this.selectedPublicDetail ?? this.selectedDetailItem;
        return catalogEntryText(work?.FechaAlta, work?.FechaAltaAproximada);
    }

    publicDetailPublicationDate(): string | null {
        return this.selectedEdition()?.FechaPublicacion ?? (this.publicDetailEditions().length ? null : this.selectedPublicDetail?.FechaPublicacion ?? this.selectedDetailItem?.FechaPublicacion ?? null);
    }

    toggleSelectedEditionOwnership(): void {
        const item = this.selectedDetailItem;
        const edition = this.selectedEdition();
        if (!item || !edition || this.isSavingEditions)
            return;

        this.isSavingEditions = true;
        const getEditions = item.Tipo === 'libro'
            ? this.catalogSrv.getBookEditions(item.Id)
            : this.catalogSrv.getAnthologyEditions(item.Id);
        getEditions.pipe(switchMap(current => {
            const selected = current.Ediciones.find(candidate => candidate.Id === edition.Id);
            if (!selected)
                throw new Error('La edición ya no pertenece a esta obra.');
            const ids = ownedEditionIds(current.Ediciones).filter(id => id !== selected.Id);
            if (!selected.EnMiBiblioteca)
                ids.push(selected.Id);
            return item.Tipo === 'libro'
                ? this.collectionSrv.updateBookEditions(item.Id, ids)
                : this.collectionSrv.updateAnthologyEditions(item.Id, ids);
        })).subscribe({
            next: response => {
                this.editionSelectionError = '';
                if (this.selectedDetailItem?.Id === item.Id && this.selectedDetailItem.Tipo === item.Tipo) {
                    const ownedIds = ownedEditionIds(response.Ediciones);
                    this.selectedDetailItem = { ...this.selectedDetailItem, Ediciones: response.Ediciones };
                    if (this.selectedPublicDetail) {
                        this.selectedPublicDetail = {
                            ...this.selectedPublicDetail,
                            Ediciones: response.Ediciones,
                            MiColeccion: {
                                ...this.selectedPublicDetail.MiColeccion,
                                EnBiblioteca: this.selectedPublicDetail.MiColeccion?.EnBiblioteca || ownedIds.length > 0,
                                Estados: this.selectedPublicDetail.MiColeccion?.Estados ?? [],
                                EdicionesIds: ownedIds
                            }
                        };
                    }
                }
                this.onEditionOwnershipUpdated(response.Ediciones);
                this.collectionSrv.getUniverses().subscribe({
                    next: universes => this.universeStore.setUniverses(universes),
                    error: () => this.universeStore.clear()
                });
                this.snackBar.openSnackBar(response.Ediciones.find(value => value.Id === edition.Id)?.EnMiBiblioteca
                    ? 'Edición añadida a tu biblioteca'
                    : 'Edición retirada; la obra y su historial permanecen en tu biblioteca', 'successBar');
            },
            error: error => {
                if (getApiErrorCode(error) === 'edition_selection_invalid' && getApiErrorField(error) === 'EdicionesIds')
                    this.editionSelectionError = getApiErrorMessage(error, 'Revisa las ediciones seleccionadas.');
                if (error instanceof Error && !('status' in error))
                    this.snackBar.openSnackBar(error.message, 'errorBar');
                else
                    this.snackBar.openApiError(error, 'No se ha podido actualizar la edición');
                this.isSavingEditions = false;
            },
            complete: () => { this.isSavingEditions = false; }
        });
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

    /** La nota media de la obra al final de cada mes, solo los meses con dato (umbral de tres personas). */
    publicDetailRatingEvolution(): Array<{ label: string; value: string }> {
        return ratingEvolutionRows(this.publicDetailStats()?.EvolucionNota);
    }

    /** Ritmo de los lectores y días para terminar: la API los deja en null con menos de tres lectores que comparten. */
    publicDetailPaceRows(): Array<{ label: string; value: string }> {
        const stats = this.publicDetailStats();
        const rows: Array<{ label: string; value: string }> = [];
        const decimal = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
        if (stats?.RitmoLectores !== null && stats?.RitmoLectores !== undefined)
            rows.push({ label: 'págs. por día de lectura', value: decimal(stats.RitmoLectores) });
        if (stats?.DiasMediosParaTerminar !== null && stats?.DiasMediosParaTerminar !== undefined)
            rows.push({ label: 'días para terminarlo', value: decimal(stats.DiasMediosParaTerminar) });
        return rows;
    }

    isDetailInCollection(): boolean {
        const ownCollection = this.selectedPublicDetail?.MiColeccion;
        if (ownCollection)
            return ownCollection.EnBiblioteca ||
                !!ownCollection.EdicionesIds?.length ||
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

        return this.selectedDetailItem ? getLatestStatusName(this.selectedDetailItem.Estados) : '';
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

    /**
     * «Denunciar» a la vista en cada reseña ajena (MODERACION.md): las reseñas son de Libros y se denuncian con su
     * propia denuncia (`POST /reportes`), que revisa su moderación. Lo que se denuncia de la plataforma (personas,
     * mensajes) va por `yosiftware.denunciar`.
     */
    canReportReview(review: CatalogPublicReview): boolean {
        const item = this.selectedDetailItem;
        return !!this.reportSrv && !!item && Number.isInteger(review.UsuarioId) && (review.UsuarioId ?? 0) > 0
            && review.UsuarioId !== this.sessionSrv.userId && !this.reportedReviewKeys.has(this.reviewKey(review));
    }

    reportReview(review: CatalogPublicReview): void {
        const item = this.selectedDetailItem;
        if (!item || !this.reportSrv || !this.canReportReview(review)) return;
        const reason = window.prompt('¿Por qué denuncias esta reseña? (máximo 1.000 caracteres)')?.trim();
        if (!reason) return;
        const key = this.reviewKey(review);
        this.reportedReviewKeys.add(key);
        this.reportSrv.create({ TipoFuente: 'resena', EntidadTipo: item.Tipo, EntidadId: item.Id, UsuarioFuenteId: review.UsuarioId!, Motivo: reason.slice(0, 1000) }).subscribe({
            next: () => this.snackBar.openSnackBar('Denuncia enviada. La revisaremos.', 'successBar'),
            error: error => {
                this.reportedReviewKeys.delete(key);
                this.snackBar.openApiError(error, 'No se pudo enviar la denuncia');
            }
        });
    }

    private reviewKey(review: CatalogPublicReview): string {
        return `${this.selectedDetailItem?.Tipo}:${this.selectedDetailItem?.Id}:${review.UsuarioId}`;
    }

    publicReviewAuthorLabel(review: CatalogPublicReview): string {
        return review.Usuario?.Nombre || 'Usuario';
    }

    publicReviewAuthorHandle(review: CatalogPublicReview): string {
        return this.toUserHandle(this.publicReviewAuthorLabel(review));
    }

    publicOwnReviewAuthorHandle(): string {
        return this.toUserHandle(this.sessionSrv.userName || 'Usuario');
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

    /** Aviso tras guardar el editor de estado; Catálogo distingue el alta de la actualización. */
    protected announceCollectionSaved(_item: CatalogItem, _wasInCollection: boolean): void {
        this.snackBar.openSnackBar('Biblioteca personal actualizada', 'successBar');
    }

    /** Lo que el container rehace tras guardar el editor de estado (Catálogo recarga su listado). */
    protected afterCollectionSaved(): void { }

    /** La ficha completó la obra con «Mi colección»: el container puede reflejarlo en su listado. */
    protected onDetailItemUpdated(_item: CatalogItem): void { }

    /** Cambió la propiedad de las ediciones: el container puede reflejarlo en su listado. */
    protected onEditionOwnershipUpdated(_editions: Edition[]): void { }

    protected cancelPublicDetailRequest(): void {
        this.publicDetailRequest?.unsubscribe();
    }

    protected catalogOptionsLabel(options: CatalogOption[] | string[] | null | undefined): string {
        if (!options?.length)
            return '';

        return options
            .map(option => typeof option === 'string' ? option : option.Nombre)
            .filter(Boolean)
            .join(', ');
    }

    protected reviewPayloadValue(): string | null {
        const review = this.selectedCollectionReview.trim();
        return review ? review : null;
    }

    private applyOwnCollectionFromDetail(detail: CatalogPublicDetail): void {
        if (!this.selectedDetailItem || !detail.MiColeccion)
            return;

        const ownStatuses = this.ownCollectionStatuses(detail.MiColeccion);
        this.selectedDetailItem = {
            ...this.selectedDetailItem,
            Ediciones: detail.Ediciones ?? this.selectedDetailItem.Ediciones,
            Estados: ownStatuses,
            Puntuacion: detail.MiColeccion.Puntuacion ?? detail.Puntuacion ?? this.selectedDetailItem.Puntuacion ?? null,
            Resena: detail.MiColeccion.Resena ?? detail.Resena ?? this.selectedDetailItem.Resena ?? null,
            ResenaOculta: detail.MiColeccion.ResenaOculta ?? false,
            PuedeAbrirNarrativa: detail.MiColeccion.PuedeAbrirNarrativa ?? detail.PuedeAbrirNarrativa ?? this.selectedDetailItem.PuedeAbrirNarrativa,
            NarrativaPersonalDisponible: detail.MiColeccion.NarrativaPersonalDisponible ?? detail.NarrativaPersonalDisponible ?? this.selectedDetailItem.NarrativaPersonalDisponible
        };
        this.onDetailItemUpdated(this.selectedDetailItem);
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
}
