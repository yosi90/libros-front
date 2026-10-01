import { of, throwError } from 'rxjs';
import { CatalogRequest } from '../../../../interfaces/catalog';
import { CatalogRequestService } from '../../../../services/entities/catalog-request.service';
import { CatalogModerationComponent } from './catalog-moderation.component';

describe('CatalogModerationComponent grouped requests', () => {
    it('requires confirmation before deciding for several people and reports the resolved count', () => {
        const requests = jasmine.createSpyObj<CatalogRequestService>('CatalogRequestService', ['resolve', 'list']);
        requests.resolve.and.returnValue(of({ success: true, Id: 8, Estado: 'rechazada', ParticipantesResueltos: 3 }));
        requests.list.and.returnValue(of([]));
        const snackBar = { openSnackBar: jasmine.createSpy('openSnackBar'), openApiError: jasmine.createSpy('openApiError') };
        const component = new CatalogModerationComponent(requests, {} as never, snackBar as never, {} as never, {} as never, {} as never);
        const group = {
            Id: 8, TipoEntidad: 'libro', Accion: 'alta', Estado: 'pendiente', GrupoISBN: 42,
            Participantes: 3, Payload: { ISBN: '9780306406157' }
        } as CatalogRequest;

        component.prepareRequestResolution(group, 'rechazada');
        expect(requests.resolve).not.toHaveBeenCalled();
        expect(component.pendingGroupResolution).toEqual({ requestId: 8, Estado: 'rechazada' });

        component.confirmGroupResolution(group);
        expect(requests.resolve).toHaveBeenCalledWith(8, { Estado: 'rechazada', Comentario: null });
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Petición resuelta para 3 participantes', 'successBar');
    });
});

describe('CatalogModerationComponent existing works', () => {
    function setup(admin = false) {
        const requests = jasmine.createSpyObj('requests', ['resolve', 'list']);
        requests.resolve.and.returnValue(of({ success: true, Id: 8, Estado: 'aprobada', EdicionId: 312 }));
        requests.list.and.returnValue(of([]));
        const catalog = jasmine.createSpyObj('catalog', ['getBooks', 'getAnthologies', 'getBookEditions', 'getAnthologyEditions']);
        const snackBar = jasmine.createSpyObj('snackBar', ['openSnackBar', 'openApiError']);
        const sync = jasmine.createSpyObj('sync', ['refreshAfterCatalogChange']);
        const component = new CatalogModerationComponent(requests, {} as never, snackBar, catalog, { isAdmin: admin } as never, sync);
        const request = { Id: 8, TipoEntidad: 'libro', Accion: 'alta', Estado: 'pendiente', ISBN: '9780306406157',
            Payload: { ISBN: '9780306406157', FechaPublicacion: '2026' }, Participantes: 1 } as CatalogRequest;
        return { component, request, requests, catalog, snackBar, sync };
    }

    for (const type of ['libro', 'antologia'] as const) {
        it(`searches only ${type} and confirms an existing work without sending its metadata`, () => {
            const { component, request, requests, catalog, sync } = setup();
            request.TipoEntidad = type;
            const work = { Id: 53, Tipo: type, Nombre: 'Obra existente', Autores: [], Estados: [], Portada: '' };
            catalog.getBooks.and.returnValue(of([work]));
            catalog.getAnthologies.and.returnValue(of([work]));
            component.openExistingWork(request);
            component.prepareRequestResolution(request, 'aprobada');
            expect(requests.resolve).not.toHaveBeenCalled();
            component.workQuery = 'Obra';
            component.searchWorks(request);
            expect(type === 'libro' ? catalog.getBooks : catalog.getAnthologies).toHaveBeenCalledWith({ q: 'Obra' });
            expect(type === 'libro' ? catalog.getAnthologies : catalog.getBooks).not.toHaveBeenCalled();
            component.selectedWork = work;
            component.prepareRequestResolution(request, 'aprobada');
            expect(requests.resolve).not.toHaveBeenCalled();
            component.confirmGroupResolution(request);
            expect(requests.resolve).toHaveBeenCalledWith(8, { Estado: 'aprobada', Comentario: null, Obra: { ObraId: 53 } });
            expect(sync.refreshAfterCatalogChange).toHaveBeenCalled();
        });
    }

    it('preserves the chosen work after an ISBN conflict and only sends a shared link explicitly as admin', () => {
        const { component, request, requests, catalog, snackBar } = setup(true);
        const edition = { Id: 312, ISBN: request.ISBN!, Portada: '', FechaPublicacion: null, EnMiBiblioteca: false };
        component.openExistingWork(request);
        component.selectedWork = { Id: 53, Tipo: 'libro', Nombre: 'Destino', Autores: [], Estados: [], Portada: '' };
        const error = { status: 409, error: { code: 'catalog_request_isbn_conflict', error: 'ISBN compartido' } };
        requests.resolve.and.returnValue(throwError(() => error));
        component.prepareRequestResolution(request, 'aprobada');
        component.confirmGroupResolution(request);
        expect(component.selectedWork.Id).toBe(53);
        expect(component.isResolvingRequest).toBeFalse();
        expect(snackBar.openApiError).toHaveBeenCalledWith(error, 'Error al resolver la petición');
        catalog.getBooks.and.returnValue(of([]));
        catalog.getAnthologies.and.returnValue(of([{ Id: 9, Tipo: 'antologia', Nombre: 'Ómnibus' }]));
        catalog.getAnthologyEditions.and.returnValue(of({ Ediciones: [edition, { ...edition, Id: 99, ISBN: 'otro' }] }));
        component.findSharedEditions(request);
        expect(component.sharedEditions).toEqual([{ edition, workName: 'Ómnibus' }]);
        expect(component.selectedSharedEdition).toBeNull();
        component.selectedSharedEdition = edition;
        requests.resolve.and.returnValue(of({ success: true, Id: 8, Estado: 'aprobada', EdicionId: 312 }));
        component.prepareRequestResolution(request, 'aprobada');
        component.confirmGroupResolution(request);
        expect(requests.resolve).toHaveBeenCalledWith(8, { Estado: 'aprobada', Comentario: null,
            Obra: { ObraId: 53, VincularEdicionId: 312 } });
    });

    it('does not allow a moderator to load or send a shared link, or attach Obra to rejection', () => {
        const { component, request, requests, catalog } = setup();
        component.openExistingWork(request);
        component.selectedWork = { Id: 53, Tipo: 'libro', Nombre: 'Destino', Autores: [], Estados: [], Portada: '' };
        component.findSharedEditions(request);
        expect(catalog.getBooks).not.toHaveBeenCalled();
        component.selectedSharedEdition = { Id: 312, ISBN: null, Portada: '', FechaPublicacion: null, EnMiBiblioteca: false };
        component.prepareRequestResolution(request, 'aprobada');
        component.confirmGroupResolution(request);
        expect(requests.resolve).toHaveBeenCalledWith(8, { Estado: 'aprobada', Comentario: null, Obra: { ObraId: 53 } });
        component.openExistingWork(request);
        component.prepareRequestResolution(request, 'rechazada');
        expect(requests.resolve).toHaveBeenCalledWith(8, { Estado: 'rechazada', Comentario: null });
    });
});
