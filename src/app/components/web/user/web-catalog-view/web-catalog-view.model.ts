import { CatalogEntityType } from '../../../../interfaces/catalog';
import type { MobileCatalogController } from '../../../mobile/user/mobile-catalog-view/mobile-catalog-view.model';
import { WebPublicDetailController } from '../../ui/web-public-detail-panel/web-public-detail-panel.model';

/**
 * Contrato del Catálogo Web: el mismo que Mobile más las peticiones que en Web
 * se ofrecen desde la cabecera (altas de otros tipos y corrección genérica).
 */
export type WebCatalogController = MobileCatalogController & WebPublicDetailController & {
    readonly otherRequestTypes: ReadonlyArray<{ type: CatalogEntityType; icon: string; label: string }>;
    isRequestModalOpen: boolean;
    openNewRequest(type: CatalogEntityType): void;
    openGenericCorrection(): void;
};
