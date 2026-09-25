import { CatalogEntityType, CatalogPublicDetail } from '../../../../interfaces/catalog';
import type { MobileCatalogController } from '../../../mobile/user/mobile-catalog-view/mobile-catalog-view.model';

/**
 * Contrato del Catálogo Web: el mismo que Mobile más las peticiones que en Web
 * se ofrecen desde la cabecera (altas de otros tipos y corrección genérica).
 */
export interface WebCatalogController extends MobileCatalogController {
    readonly otherRequestTypes: ReadonlyArray<{ type: CatalogEntityType; icon: string; label: string }>;
    selectedPublicDetail: CatalogPublicDetail | null;
    isRequestModalOpen: boolean;
    selectedCollectionItem: unknown;
    openNewRequest(type: CatalogEntityType): void;
    openGenericCorrection(): void;
}
