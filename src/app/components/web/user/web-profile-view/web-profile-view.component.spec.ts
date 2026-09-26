import { ElementRef } from '@angular/core';
import type { UserProfileComponent } from '../../../shared/user-pages/user-profile/user-profile.component';
import { WebProfileViewComponent } from './web-profile-view.component';

describe('WebProfileViewComponent', () => {
    function create(user: Record<string, unknown> = {}) {
        const component = new WebProfileViewComponent(new ElementRef(document.createElement('div')));
        component.controller = {
            userData: { name: 'Lector', username: '', displayName: '', bio: '', ...user },
            myRequests: [{}, {}],
            myReports: [],
            errorBioMessage: 'Biografía demasiado larga'
        } as unknown as UserProfileComponent;
        return component;
    }

    it('muestra valores por defecto cuando faltan datos de identidad', () => {
        const component = create();

        expect(component.value('username')).toBe('Sin alias');
        expect(component.value('displayName')).toBe('Lector');
        expect(component.value('bio')).toBe('Sin biografía');
        expect(component.error('bio')).toBe('Biografía demasiado larga');
    });

    it('cuenta peticiones y reportes para las insignias de la navegación', () => {
        const component = create();

        expect(component.badge('requests')).toBe(2);
        expect(component.badge('reports')).toBe(0);
        expect(component.badge('overview')).toBe(0);
    });

    it('agrupa los estados de peticiones y reportes por tono', () => {
        const component = create();

        expect(component.requestTone('aprobada')).toBe('ok');
        expect(component.requestTone('aceptado')).toBe('ok');
        expect(component.requestTone('rechazada')).toBe('ko');
        expect(component.requestTone('devuelta')).toBe('warn');
        expect(component.requestTone('pendiente')).toBe('pending');
    });
});
