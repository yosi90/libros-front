import { CatalogItem, CatalogPublicDetail, CatalogPublicReview, CatalogPublicStats } from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';

/** Lo que necesita la ficha pública Web; lo cumplen Catálogo y los gestores. */
export interface WebPublicDetailController {
    selectedDetailItem: CatalogItem | null;
    selectedPublicDetail: CatalogPublicDetail | null;
    /** Modales que se abren encima de la ficha: mientras estén abiertos, Escape no la cierra. */
    selectedCollectionItem: unknown;
    isRequestModalOpen?: boolean;
    isLoadingPublicDetail: boolean;
    publicDetailLoadFailed: boolean;
    isSavingCollection: boolean;
    publicReviewPage: number;
    statusOptions: ReadonlyArray<{ Id: ReadingStatusId; Nombre: string; icon: string }>;
    /** Opcional: sin él, «Añadir» abre el editor de estado. */
    addToCollectionWithStatus?(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void;
    closePublicDetailModal(): void;
    openCollectionModal(item: CatalogItem, event?: MouseEvent): void;
    openReadingFromDetail(): void;
    isDetailInCollection(): boolean;
    handleCoverImageError(event: Event): void;
    publicDetailTitle(): string;
    publicDetailAuthorsLabel(): string;
    publicDetailLanguagesLabel(): string;
    publicDetailStylesLabel(): string;
    publicDetailAverageRatingLabel(): string;
    publicDetailPersonalStatusName(): string;
    publicDetailPersonalRating(): number | null;
    publicDetailPersonalReview(): string;
    publicDetailStats(): CatalogPublicStats | null;
    pagedPublicReviewRows(): CatalogPublicReview[];
    publicReviewRows(): CatalogPublicReview[];
    publicReviewAuthorHandle(review: CatalogPublicReview): string;
    publicReviewDate(review: CatalogPublicReview): string | null;
    hasPublicReviewPages(): boolean;
    publicReviewTotalPages(): number;
    previousPublicReviewPage(): void;
    nextPublicReviewPage(): void;
}
