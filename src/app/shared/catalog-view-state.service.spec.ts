import { CatalogViewStateService } from './catalog-view-state.service';

describe('CatalogViewStateService', () => {
    it('delivers a prepared public detail only once', () => {
        const service = new CatalogViewStateService();
        const item = { Id: 4, Tipo: 'antologia', Nombre: 'Arcanum ilimitado' } as any;

        service.setPendingDetail(item);

        expect(service.consumePendingDetail()).toEqual(item);
        expect(service.consumePendingDetail()).toBeNull();
    });

    it('notifies an already mounted library when an item must be revealed', () => {
        const service = new CatalogViewStateService();
        const received: unknown[] = [];
        service.libraryRevealRequested$.subscribe(target => received.push(target));

        service.setPendingLibraryReveal({ type: 'book', id: 8 });

        expect(received).toEqual([{ type: 'book', id: 8 }]);
        expect(service.consumePendingLibraryReveal()).toEqual({ type: 'book', id: 8 });
    });
});
