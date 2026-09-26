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

    it('aplica los filtros de los selectores con valores numéricos o vacíos', () => {
        const { component, controller } = create();

        component.applySelect({ target: { value: '3' } } as unknown as Event, 'rating');
        component.applySelect({ target: { value: '' } } as unknown as Event, 'language');

        expect(controller.selectedRatingFilter).toBe(3);
        expect(controller.selectedLanguageFilter).toBe('');
        expect(controller.applySelectFilters).toHaveBeenCalledTimes(2);
        expect(component.activeSelectCount).toBe(1);
    });
});
