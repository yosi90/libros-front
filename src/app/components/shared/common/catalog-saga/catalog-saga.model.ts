import { CatalogItem } from '../../../../interfaces/catalog';
import { Saga, SagaCatalogDetail } from '../../../../interfaces/saga';

/** Lo que las piezas de saga del catálogo necesitan del contenedor. */
export interface CatalogSagaController {
    sagaMatches: Saga[];
    selectedSaga: SagaCatalogDetail | null;
    sagaItems: CatalogItem[];
    isLoadingSaga: boolean;
    sagaLoadFailed: boolean;
    readonly isSagaOpen: boolean;
    openSaga(sagaId: number): void;
    closeSaga(): void;
    openSagaItem(item: CatalogItem): void;
    isInCollection(item: CatalogItem): boolean;
    handleCoverImageError(event: Event): void;
}
