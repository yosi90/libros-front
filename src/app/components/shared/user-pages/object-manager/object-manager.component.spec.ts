import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { SessionService } from '../../../../services/auth/session.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { ObjectManagerComponent } from './object-manager.component';

describe('ObjectManagerComponent catalog requests', () => {
    let component: ObjectManagerComponent;
    let requestService: jasmine.SpyObj<CatalogRequestService>;
    let loader: jasmine.SpyObj<LoaderEmmitterService>;
    let snackBar: { openSnackBar: jasmine.Spy; openApiError: jasmine.Spy };

    beforeEach(() => {
        requestService = jasmine.createSpyObj<CatalogRequestService>('CatalogRequestService', ['create']);
        requestService.create.and.returnValue(of({ success: true, Id: 41, Estado: 'pendiente' }));
        loader = jasmine.createSpyObj<LoaderEmmitterService>('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        snackBar = { openSnackBar: jasmine.createSpy('openSnackBar'), openApiError: jasmine.createSpy('openApiError') };
        const unused = {} as never;
        const router = { navigate: jasmine.createSpy('navigate') } as never;

        component = new ObjectManagerComponent(
            unused,
            router,
            new FormBuilder(),
            unused,
            unused,
            unused,
            unused,
            unused,
            unused,
            unused,
            snackBar as never,
            loader,
            { canModerateCatalog: false } as SessionService,
            unused,
            unused,
            requestService
        );
    });

    it('sends a creation request instead of writing the catalog for a non-editor', () => {
        component.name.setValue('Octavia E. Butler');
        component.nativeLanguageId.setValue(2);
        component.originPlace.setValue('Pasadena');

        component.save();

        expect(requestService.create).toHaveBeenCalledWith({
            TipoEntidad: 'autor',
            Accion: 'alta',
            Payload: {
                Nombre: 'Octavia E. Butler',
                IdiomaId: 2,
                LugarOrigenNombre: 'Pasadena'
            }
        });
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Petición de catálogo enviada para revisión', 'successBar');
        expect(loader.deactivateLoader).toHaveBeenCalled();
    });

    it('includes the entity id when proposing a correction', () => {
        component.selectedRow = {
            id: 12,
            name: 'Octavia Butler',
            authors: [],
            booksCount: 0,
            universesCount: 0,
            sagasCount: 0,
            anthologiesCount: 0,
            raw: { Id: 12, Nombre: 'Octavia Butler' }
        };
        component.name.setValue('Octavia E. Butler');

        component.save();

        expect(requestService.create).toHaveBeenCalledWith(jasmine.objectContaining({
            TipoEntidad: 'autor',
            Accion: 'edicion',
            EntidadId: 12
        }));
    });
});

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
            unused, unused, new FormBuilder(), unused, unused, unused, unused, unused,
            unused, universeStore as never,
            { openSnackBar: jasmine.createSpy('openSnackBar'), openApiError: jasmine.createSpy('openApiError') } as never,
            unused, { canModerateCatalog: false } as SessionService, catalog, collection, unused
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
