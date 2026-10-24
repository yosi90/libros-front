import { ElementRef } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import type { AccountSecurityComponent } from '../../../shared/user-pages/account-security/account-security.component';
import { WebAccountSecurityViewComponent } from './web-account-security-view.component';

describe('WebAccountSecurityViewComponent', () => {
    function create(section: string | null, controller: Partial<AccountSecurityComponent> = {}) {
        const route = { snapshot: { queryParamMap: convertToParamMap(section ? { section } : {}) } } as unknown as ActivatedRoute;
        const component = new WebAccountSecurityViewComponent(route, new ElementRef(document.createElement('div')));
        component.controller = { ...controller } as unknown as AccountSecurityComponent;
        component.ngOnInit();
        return component;
    }

    it('abre el apartado pedido por la ruta y descarta los desconocidos', () => {
        expect(create('data').activeSection).toBe('data');
        expect(create('privacy').activeSection).toBe('privacy');
        expect(create('otra').activeSection).toBe('account');
        expect(create(null).activeSection).toBe('account');
        // Los apartados de entrar ya no existen: son de la cuenta de Yosiftware.
        expect(create('devices').activeSection).toBe('account');
    });

    it('lleva los apartados retirados (normas, moderación y bloqueos) a la privacidad', () => {
        expect(create('blocks').activeSection).toBe('privacy');
        expect(create('policies').activeSection).toBe('privacy');
        expect(create('moderation').activeSection).toBe('privacy');
    });
});
