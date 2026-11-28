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
            selectedNewFilter: '',
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

    it('el filtro «Nuevos» también cuenta como activo', () => {
        const { component } = create({ selectedNewFilter: '7d' });

        expect(component.activeSelectCount).toBe(1);
    });

    it('enseña cada filtro activo con su valor y lo quita como «Todos» en su desplegable', () => {
        const applySelectFilter = jasmine.createSpy('applySelectFilter');
        const applyNewFilter = jasmine.createSpy('applyNewFilter');
        const { component } = create({
            selectedNewFilter: '7d', selectedStatusFilter: 4, selectedRatingFilter: 3, selectedStyleFilter: 9,
            newWorksOptions: [{ value: '7d', label: 'Última semana' }],
            statusOptions: [{ Id: 4, Nombre: 'Quiero leer', icon: 'bookmark_add' }],
            languages: [], styles: [{ Id: 9, Nombre: 'Fantasía' }],
            applySelectFilter, applyNewFilter
        } as unknown as Partial<WebCatalogController>);

        expect(component.activeFilters.map(filter => filter.label)).toEqual(['Última semana', 'Quiero leer', '3 o más estrellas', 'Fantasía']);

        component.clearFilter('style');
        expect(applySelectFilter).toHaveBeenCalledWith('style', jasmine.objectContaining({ target: { value: '' } }));
        component.clearFilter('new');
        expect(applyNewFilter).toHaveBeenCalledWith(jasmine.objectContaining({ target: { value: '' } }));
    });
});
