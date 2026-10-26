import { CatalogItem, CatalogPublicDetail, CatalogPublicReview, CatalogPublicStats, Edition } from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import type { BookTitleState } from '../book-title/book-title.state';

/**
 * Lo que necesitan las vistas de la ficha pública de una obra (Web, Wood y Mobile).
 * Lo cumplen Catálogo y los gestores del Perfil a través de PublicDetailHost.
 */
export interface PublicDetailController {
    selectedDetailItem: CatalogItem | null;
    selectedPublicDetail: CatalogPublicDetail | null;
    /** Modales que se abren encima de la ficha: mientras estén abiertos, Escape no la cierra. */
    selectedCollectionItem: CatalogItem | null;
    isRequestModalOpen?: boolean;
    isLoadingPublicDetail: boolean;
    publicDetailLoadFailed: boolean;
    isSavingCollection: boolean;
    isSavingEditions: boolean;
    editionSelectionError: string;
    publicReviewPage: number;
    statusOptions: ReadonlyArray<{ Id: ReadingStatusId; Nombre: string; icon: string }>;
    /** «Tu título» de la obra si es un libro de la colección (en la tarjeta «Mi biblioteca»). */
    bookTitle: BookTitleState;
    /** Opcional: sin él, «Añadir» abre el editor de estado. */
    addToCollectionWithStatus?(item: CatalogItem, statusId: ReadingStatusId, event?: MouseEvent): void;
    closePublicDetailModal(): void;
    openCollectionModal(item: CatalogItem, event?: MouseEvent): void;
    openReadingFromDetail(): void;
    isDetailInCollection(): boolean;
    handleCoverImageError(event: Event): void;
    publicDetailTitle(): string;
    publicDetailCoverName(): string | null;
    publicDetailEditions(): Edition[];
    selectedEdition(): Edition | null;
    selectEdition(editionId: number): void;
    toggleSelectedEditionOwnership(): void;
    publicDetailIsbn(): string | null;
    publicDetailPublicationDate(): string | null;
    publicDetailCatalogEntry(): string;
    publicDetailAuthorsLabel(): string;
    publicDetailLanguagesLabel(): string;
    publicDetailStylesLabel(): string;
    publicDetailAverageRatingLabel(): string;
    publicDetailPersonalStatusName(): string;
    publicDetailPersonalRating(): number | null;
    publicDetailPersonalReview(): string;
    publicDetailStats(): CatalogPublicStats | null;
    publicDetailPaceRows(): Array<{ label: string; value: string }>;
    publicDetailRatingEvolution(): Array<{ label: string; value: string }>;
    pagedPublicReviewRows(): CatalogPublicReview[];
    publicReviewRows(): CatalogPublicReview[];
    publicReviewAuthorHandle(review: CatalogPublicReview): string;
    /** «Denunciar» una reseña ajena con la denuncia propia de Libros. */
    canReportReview(review: CatalogPublicReview): boolean;
    reportReview(review: CatalogPublicReview): void;
    publicReviewDate(review: CatalogPublicReview): string | null;
    hasPublicReviewPages(): boolean;
    publicReviewTotalPages(): number;
    previousPublicReviewPage(): void;
    nextPublicReviewPage(): void;
}
