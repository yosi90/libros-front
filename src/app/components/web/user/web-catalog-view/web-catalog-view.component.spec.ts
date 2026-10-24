import { CatalogItem } from '../../../../interfaces/catalog';
import { WebCatalogViewComponent } from './web-catalog-view.component';
import { WebCatalogController } from './web-catalog-view.model';

describe('WebCatalogViewComponent', () => {
    const item = { Tipo: 'libro', Id: 5, Nombre: 'Siega', Portada: null, Autores: [], Estados: [], ISBN: '', FechaPublicacion: '2016-11-22' } as CatalogItem;

    function create(overrides: Partial<WebCatalogController> = {}): { component: WebCatalogViewComponent; controller: WebCatalogController } {
        const controller = {
            selectedDetailItem: item,
            selectedPublicDetail: null,
            selectedCollectionItem: null,
            isRequestModalOpen: false,
            selectedStatusFilter: '',
            selectedRatingFilter: '',
            selectedLanguageFilter: '',
            selectedStyleFilter: '',
            applySelectFilters: jasmine.createSpy('applySelectFilters'),
            closePublicDetailModal: jasmine.createSpy('closePublicDetailModal'),
            publicDetailLanguagesLabel: () => 'Español',
            publicDetailStylesLabel: () => '',
            ...overrides
        } as unknown as WebCatalogController;
        const component = new WebCatalogViewComponent();
        component.controller = controller;
        return { component, controller };
    }

    it('cuenta los filtros de selector activos', () => {
        const { component } = create({ selectedRatingFilter: 3, selectedLanguageFilter: '' });

        expect(component.activeSelectCount).toBe(1);
    });
});
