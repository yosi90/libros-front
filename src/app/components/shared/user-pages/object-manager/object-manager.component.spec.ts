import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { SessionService } from '../../../../services/auth/session.service';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { ObjectManagerComponent } from './object-manager.component';

describe('ObjectManagerComponent catalog requests', () => {
    let component: ObjectManagerComponent;
    let requestService: jasmine.SpyObj<CatalogRequestService>;
    let loader: jasmine.SpyObj<LoaderEmmitterService>;
    let snackBar: { openSnackBar: jasmine.Spy };

    beforeEach(() => {
        requestService = jasmine.createSpyObj<CatalogRequestService>('CatalogRequestService', ['create']);
        requestService.create.and.returnValue(of({ success: true, Id: 41, Estado: 'pendiente' }));
        loader = jasmine.createSpyObj<LoaderEmmitterService>('LoaderEmmitterService', ['activateLoader', 'deactivateLoader']);
        snackBar = { openSnackBar: jasmine.createSpy('openSnackBar') };
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
