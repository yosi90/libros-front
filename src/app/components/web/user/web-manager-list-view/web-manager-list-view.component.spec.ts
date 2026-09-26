import type { ObjectManagerComponent } from '../../../shared/user-pages/object-manager/object-manager.component';
import { ManagerRow } from '../../../shared/user-pages/object-manager/object-manager.models';
import { WebManagerListViewComponent } from './web-manager-list-view.component';

describe('WebManagerListViewComponent', () => {
    function create() {
        const controller = {
            authors: [{ Id: 4, Nombre: 'Frank Herbert' }],
            sortDirection: 'asc',
            isSystemRow: (row: ManagerRow) => row.id === 1,
            openEmbeddedRow: jasmine.createSpy('openEmbeddedRow'),
            resetPage: jasmine.createSpy('resetPage'),
            setSortDirection: jasmine.createSpy('setSortDirection')
        } as unknown as ObjectManagerComponent;
        const component = new WebManagerListViewComponent();
        component.controller = controller;
        return { component, controller };
    }

    it('filtra por autor guardando también su nombre', () => {
        const { component, controller } = create();

        component.setAuthorFilter({ target: { value: '4' } } as unknown as Event);

        expect(controller.selectedAuthorFilter).toBe(4);
        expect(controller.authorFilterText).toBe('Frank Herbert');
        expect(controller.resetPage).toHaveBeenCalled();
    });

    it('no abre las filas del sistema', () => {
        const { component, controller } = create();

        component.open({ id: 1 } as ManagerRow);
        component.open({ id: 2 } as ManagerRow);

        expect(controller.openEmbeddedRow).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 2 }));
    });

    it('invierte el sentido del orden', () => {
        const { component, controller } = create();

        component.toggleDirection();

        expect(controller.setSortDirection).toHaveBeenCalledWith('desc');
    });
});
