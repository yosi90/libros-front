import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { WebCommandPaletteComponent } from './web-command-palette.component';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { UniverseStoreService } from '../../../../services/stores/universe-store.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CatalogViewStateService } from '../../../../shared/catalog-view-state.service';

describe('WebCommandPaletteComponent', () => {
    let component: WebCommandPaletteComponent;
    let router: { url: string; navigate: jasmine.Spy };
    let mode: string;
    let catalogState: CatalogViewStateService;
    const universes = {
        getAllBooks: () => [{ Id: 5, Nombre: 'El imperio final', Autores: [{ Id: 1, Nombre: 'Brandon Sanderson' }] }],
        getAllAnthologies: () => []
    };
    const book = {
        Id: 73, Nombre: 'Siega',
        Capitulos: [{ Id: 12, Nombre: 'La guadaña', Orden: 2, Pagina: 10 }, { Id: 11, Nombre: 'Citra', Orden: 1, Pagina: 1 }],
        Interludios: [],
        Personajes: [{ Id: 21, Nombre: 'Rowan Damisch', Apodos: [{ Apodo: 'Lucifer' }] }]
    };

    const press = (key: string, init: KeyboardEventInit = {}) => {
        const event = new KeyboardEvent('keydown', { key, cancelable: true, ...init });
        component.onDocumentKeydown(event);
        return event;
    };

    beforeEach(() => {
        mode = 'web';
        router = { url: '/book/73/statistics', navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
        spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
        TestBed.configureTestingModule({
            imports: [WebCommandPaletteComponent],
            providers: [
                { provide: Router, useValue: router },
                { provide: PresentationModeService, useValue: { get snapshot() { return { activeMode: mode }; } } },
                { provide: BookStoreService, useValue: { getBook: () => book } },
                { provide: UniverseStoreService, useValue: universes },
                { provide: CatalogService, useValue: { getBooks: () => of([]) } }
            ]
        });
        component = TestBed.createComponent(WebCommandPaletteComponent).componentInstance;
        catalogState = TestBed.inject(CatalogViewStateService);
    });

    it('se abre y se cierra con Ctrl+K en escritorio', () => {
        expect(press('k', { ctrlKey: true }).defaultPrevented).toBeTrue();
        expect(component.open()).toBeTrue();
        press('k', { ctrlKey: true });
        expect(component.open()).toBeFalse();
    });

    it('no existe en la APK ni en pantallas táctiles', () => {
        mode = 'native-mobile';
        expect(press('k', { ctrlKey: true }).defaultPrevented).toBeFalse();
        expect(component.open()).toBeFalse();

        mode = 'web';
        (window.matchMedia as jasmine.Spy).and.returnValue({ matches: false } as MediaQueryList);
        press('k', { ctrlKey: true });
        expect(component.open()).toBeFalse();
    });

    it('ofrece capítulos en orden y personajes del libro abierto, también por apodo', () => {
        component.show();
        component.onQuery('citra');
        expect(component.items().map(item => item.label)).toEqual(['Citra']);

        component.onQuery('lucifer');
        const [character] = component.items();
        expect(character.group).toBe('Personajes');
        component.select(character);
        expect(router.navigate).toHaveBeenCalledWith(['/book', 73, 'characters'], { queryParams: { selected: 21 } });
        expect(component.open()).toBeFalse();
    });

    it('recorre los resultados con las flechas y abre con Intro', () => {
        component.show();
        component.onQuery('imperio');
        const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
        component.onKeydown(event);
        expect(router.navigate).toHaveBeenCalledWith(['/book', 5], {});
    });

    it('fuera del libro solo muestra secciones y la biblioteca', () => {
        router.url = '/dashboard/books';
        component.show();
        expect(component.items().every(item => item.group === 'Ir a')).toBeTrue();
        component.onQuery('guadaña');
        expect(component.items()).toEqual([]);
    });

    it('un resultado del catálogo abre su ficha', () => {
        const setPendingDetail = spyOn(catalogState, 'setPendingDetail');
        component.show();
        component.onQuery('dune');
        component.catalogResults.set([{ Tipo: 'libro', Id: 9, Nombre: 'Dune', Portada: null, Autores: [], Estados: [] }]);
        const item = component.items().find(entry => entry.group === 'Catálogo')!;
        component.select(item);
        expect(setPendingDetail).toHaveBeenCalledWith(jasmine.objectContaining({ Id: 9 }));
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/catalog'], {});
    });
});
