import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { BookComponent } from './book.component';

describe('BookComponent navigation and structure', () => {
    function createComponent(router: jasmine.SpyObj<Router>, partService: { createForBook: jasmine.Spy }): BookComponent {
        const route = {} as ActivatedRoute;
        return new BookComponent(
            route,
            router,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            new FormBuilder(),
            partService as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );
    }

    it('leaves and recreates the chapter form when a new chapter is requested from the same route', async () => {
        const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        Object.defineProperty(router, 'url', { value: '/book/7/chapter', configurable: true });
        router.navigate.and.resolveTo(true);
        const component = createComponent(router, { createForBook: jasmine.createSpy() });
        component.book.Id = 7;
        component.bookIndexOpen = true;

        await component.addChapter();

        expect(component.bookIndexOpen).toBeFalse();
        expect(router.navigate.calls.allArgs()).toEqual([
            [['statistics'], jasmine.objectContaining({ skipLocationChange: true })],
            [['chapter'], jasmine.any(Object)]
        ]);
    });

    it('keeps zero as the open-ended final order in the part payload', () => {
        const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        Object.defineProperty(router, 'url', { value: '/book/7/statistics', configurable: true });
        const createForBook = jasmine.createSpy('createForBook').and.returnValue(of({}));
        const component = createComponent(router, { createForBook });
        component.book.Id = 7;

        (component as any).savePart({ nombre: 'Parte 1', pagina: 1, ordenInicio: 1, ordenFinal: 0 }).subscribe();

        expect(createForBook).toHaveBeenCalledWith(7, {
            Nombre: 'Parte 1',
            OrdenInicio: 1,
            OrdenFinal: 0,
            Pagina: 1
        });
    });
});
