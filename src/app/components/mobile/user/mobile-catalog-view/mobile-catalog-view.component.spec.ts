import { MobileCatalogViewComponent } from './mobile-catalog-view.component';

describe('MobileCatalogViewComponent', () => {
    it('muestra el separador de la barra solo después de desplazar el catálogo', () => {
        const component = new MobileCatalogViewComponent();

        component.onScroll({ currentTarget: { scrollTop: 0 } } as unknown as Event);
        expect(component.contentScrolled).toBeFalse();

        component.onScroll({ currentTarget: { scrollTop: 24 } } as unknown as Event);
        expect(component.contentScrolled).toBeTrue();

        component.onScroll({ currentTarget: { scrollTop: 1 } } as unknown as Event);
        expect(component.contentScrolled).toBeFalse();
    });
});
