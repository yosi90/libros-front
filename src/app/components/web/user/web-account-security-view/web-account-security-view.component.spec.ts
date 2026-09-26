import { ElementRef } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';
import { WebAccountSecurityViewComponent } from './web-account-security-view.component';

describe('WebAccountSecurityViewComponent', () => {
    function create(section: string | null, controller: Partial<AccountSecurityComponent> = {}) {
        const route = { snapshot: { queryParamMap: convertToParamMap(section ? { section } : {}) } } as unknown as ActivatedRoute;
        const component = new WebAccountSecurityViewComponent(route, new ElementRef(document.createElement('div')));
        component.controller = {
            policies: [],
            moderationItemsCount: 0,
            reauthenticationSurfaceOpen: false,
            cancelReauthentication: jasmine.createSpy('cancelReauthentication'),
            ...controller
        } as unknown as AccountSecurityComponent;
        component.ngOnInit();
        return component;
    }

    it('abre el apartado pedido por la ruta y descarta los desconocidos', () => {
        expect(create('blocks').activeSection).toBe('blocks');
        expect(create('otra').activeSection).toBe('access');
        expect(create(null).activeSection).toBe('access');
    });

    it('marca las normas pendientes y los avisos de moderación', () => {
        const badge = AccountSecurityComponent.prototype.sectionBadge;
        const state = { policies: [{ Aceptada: false }, { Aceptada: true }], moderationItemsCount: 2 };

        expect(badge.call(state as unknown as AccountSecurityComponent, 'policies')).toBe('1');
        expect(badge.call(state as unknown as AccountSecurityComponent, 'moderation')).toBe('2');
        expect(badge.call(state as unknown as AccountSecurityComponent, 'devices')).toBe('');
    });

    it('delega el contador de cada apartado en el contenedor', () => {
        const sectionBadge = jasmine.createSpy('sectionBadge').and.returnValue('3');
        const component = create(null, { sectionBadge } as Partial<AccountSecurityComponent>);

        expect(component.badge('policies')).toBe('3');
        expect(sectionBadge).toHaveBeenCalledWith('policies');
    });

    it('cancela la confirmación de identidad con Escape', () => {
        const component = create(null, { reauthenticationSurfaceOpen: true } as Partial<AccountSecurityComponent>);

        component.closeReauthenticationOnEscape();

        expect(component.controller.cancelReauthentication).toHaveBeenCalled();
    });
});
