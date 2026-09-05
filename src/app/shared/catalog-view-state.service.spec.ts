import { CatalogViewStateService } from './catalog-view-state.service';

describe('CatalogViewStateService', () => {
    it('delivers a prepared public detail only once', () => {
        const service = new CatalogViewStateService();
        const item = { Id: 4, Tipo: 'antologia', Nombre: 'Arcanum ilimitado' } as any;

        service.setPendingDetail(item);

        expect(service.consumePendingDetail()).toEqual(item);
        expect(service.consumePendingDetail()).toBeNull();
    });
});
