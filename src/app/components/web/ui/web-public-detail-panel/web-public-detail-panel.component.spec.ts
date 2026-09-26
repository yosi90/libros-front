import { CatalogItem } from '../../../../interfaces/catalog';
import { WebPublicDetailPanelComponent } from './web-public-detail-panel.component';
import { WebPublicDetailController } from './web-public-detail-panel.model';

describe('WebPublicDetailPanelComponent', () => {
    const item = { Tipo: 'libro', Id: 5, Nombre: 'Siega', Portada: null, Autores: [], Estados: [], ISBN: '', FechaPublicacion: '2016-11-22' } as CatalogItem;

    function create(overrides: Partial<WebPublicDetailController> = {}) {
        const controller = {
            selectedDetailItem: item,
            selectedPublicDetail: null,
            selectedCollectionItem: null,
            isRequestModalOpen: false,
            closePublicDetailModal: jasmine.createSpy('closePublicDetailModal'),
            openCollectionModal: jasmine.createSpy('openCollectionModal'),
            publicDetailLanguagesLabel: () => 'Español',
            publicDetailStylesLabel: () => '',
            publicDetailPersonalStatusName: () => 'En marcha',
            ...overrides
        } as unknown as WebPublicDetailController;
        const component = new WebPublicDetailPanelComponent();
        component.controller = controller;
        return { component, controller };
    }

    it('muestra solo los datos de ficha disponibles', () => {
        const { component } = create();

        expect(component.metaRows(item).map(row => row.label)).toEqual(['Publicación', 'Idiomas']);
        expect(component.metaRows(item)[0].value).toBe('22 de noviembre de 2016');
    });

    it('traduce el estado personal a la clave y el icono de estado', () => {
        const { component } = create();

        expect(component.personalStatusKey()).toBe('en_marcha');
        expect(component.personalStatusIcon()).not.toBe('bookmark');
    });

    it('cierra con Escape salvo si hay un modal encima', () => {
        const withRequest = create({ isRequestModalOpen: true });
        withRequest.component.closeOnEscape();
        expect(withRequest.controller.closePublicDetailModal).not.toHaveBeenCalled();

        const withCollection = create({ selectedCollectionItem: item });
        withCollection.component.closeOnEscape();
        expect(withCollection.controller.closePublicDetailModal).not.toHaveBeenCalled();

        const plain = create();
        plain.component.closeOnEscape();
        expect(plain.controller.closePublicDetailModal).toHaveBeenCalled();
    });
});
