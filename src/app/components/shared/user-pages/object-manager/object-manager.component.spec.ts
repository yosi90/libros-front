import { of } from 'rxjs';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { ObjectManagerComponent } from './object-manager.component';

describe('ObjectManagerComponent editions', () => {
    let component: ObjectManagerComponent;
    let catalog: jasmine.SpyObj<CatalogService>;
    let collection: jasmine.SpyObj<CollectionService>;
    let universeStore: { setUniverses: jasmine.Spy; clear: jasmine.Spy };

    beforeEach(() => {
        catalog = jasmine.createSpyObj<CatalogService>('CatalogService', ['getBookEditions', 'getAnthologyEditions']);
        collection = jasmine.createSpyObj<CollectionService>('CollectionService', ['updateBookEditions', 'updateAnthologyEditions', 'getUniverses']);
        universeStore = { setUniverses: jasmine.createSpy('setUniverses'), clear: jasmine.createSpy('clear') };
        collection.getUniverses.and.returnValue(of([]));
        const unused = {} as never;
        component = new ObjectManagerComponent(
            unused, unused, universeStore as never,
            { openSnackBar: jasmine.createSpy('openSnackBar'), openApiError: jasmine.createSpy('openApiError') } as never,
            unused, { canModerateCatalog: false } as PlatformSessionService, catalog, collection
        );
        component.selectedDetailItem = {
            Tipo: 'libro', Id: 9, Nombre: 'Obra', Portada: null, Autores: [], Estados: [],
            Ediciones: [
                { Id: 31, ISBN: 'owned', Portada: 'owned.jpg', FechaPublicacion: null, EnMiBiblioteca: true },
                { Id: 32, ISBN: 'other', Portada: 'other.jpg', FechaPublicacion: null, EnMiBiblioteca: false }
            ]
        };
        component.selectedPublicDetail = {
            ...component.selectedDetailItem,
            MiColeccion: { EnBiblioteca: true, EdicionesIds: [31], Estados: [], Resena: 'Mi reseña' }
        } as never;
        component.selectedEditionId = 31;
    });

    it('shows the owned edition and preserves work history when removing the last copy', () => {
        expect(component.selectedEdition()?.Id).toBe(31);
        expect(component.publicDetailCoverName()).toBe('owned.jpg');
        catalog.getBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 9, Ediciones: component.publicDetailEditions() }));
        collection.updateBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 9, Ediciones: component.publicDetailEditions().map(edition => ({ ...edition, EnMiBiblioteca: false })) }));

        component.toggleSelectedEditionOwnership();

        expect(collection.updateBookEditions).toHaveBeenCalledWith(9, []);
        expect(component.selectedPublicDetail?.MiColeccion?.EnBiblioteca).toBeTrue();
        expect(component.selectedPublicDetail?.MiColeccion?.Resena).toBe('Mi reseña');
        expect(component.selectedPublicDetail?.MiColeccion?.EdicionesIds).toEqual([]);
        expect(universeStore.setUniverses).toHaveBeenCalled();
    });
});
