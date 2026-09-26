import { ElementRef } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';
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
        const component = create(null, {
            policies: [{ Aceptada: false }, { Aceptada: true }] as AccountSecurityComponent['policies'],
            moderationItemsCount: 2
        } as Partial<AccountSecurityComponent>);

        expect(component.badge('policies')).toBe('1');
        expect(component.badge('moderation')).toBe('2');
        expect(component.badge('devices')).toBe('');
    });

    it('cancela la confirmación de identidad con Escape', () => {
        const component = create(null, { reauthenticationSurfaceOpen: true } as Partial<AccountSecurityComponent>);

        component.closeReauthenticationOnEscape();

        expect(component.controller.cancelReauthentication).toHaveBeenCalled();
    });
});
