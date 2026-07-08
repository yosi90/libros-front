import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { BookAdvancedSearchComponent } from './book-advanced-search.component';
import { Book } from '../../../../interfaces/book';
import { BookStoreService } from '../../../../services/stores/book-store.service';

describe('BookAdvancedSearchComponent', () => {
    let component: BookAdvancedSearchComponent;
    let fixture: ComponentFixture<BookAdvancedSearchComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BookAdvancedSearchComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        TestBed.inject(BookStoreService).setBook(createBook());
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(BookAdvancedSearchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders the initial empty state', () => {
        expect(component.result.mode).toBe('empty');
        expect(fixture.nativeElement.textContent).toContain('Escribe para buscar');
    });

    it('shows grouped results for a query', () => {
        component.query.setValue('Dalinar');
        fixture.detectChanges();

        expect(component.result.total).toBeGreaterThan(0);
        expect(fixture.nativeElement.textContent).toContain('Dalinar Kholin');
    });

    it('exposes only groups with results', () => {
        component.query.setValue('Dalinar');

        expect(component.visibleGroups.length).toBe(1);
        expect(component.visibleGroups[0].category).toBe('characters');
    });

    it('navigates to a selected character in the generic editor', () => {
        component.query.setValue('Dalinar');
        const result = component.result.groups.find(group => group.category === 'characters')?.results[0];

        component.openResult(result!);

        expect(router.navigate).toHaveBeenCalledWith(['/book', 1, 'characters'], { queryParams: { selected: 1 } });
    });

    it('navigates to a generic entity with selected query param', () => {
        component.query.setValue('Honor');
        const result = component.result.groups.find(group => group.category === 'concepts')?.results[0];

        component.openResult(result!);

        expect(router.navigate).toHaveBeenCalledWith(['/book', 1, 'concepts'], { queryParams: { selected: 30 } });
    });
});

function createBook(): Book {
    return {
        Id: 1,
        Nombre: 'El camino de los reyes',
        Estados: [],
        Autores: [],
        Capitulos: [],
        Partes: [],
        Interludios: [],
        Personajes: [
            {
                Id: 1,
                Nombre: 'Dalinar Kholin',
                Sexo: true,
                Entradas: [],
                Apodos: [],
                Estados: [],
                Relaciones: []
            }
        ],
        Localizaciones: [],
        Conceptos: [{ Id: 30, Nombre: 'Honor', Entradas: [] }],
        Organizaciones: [],
        Eventos: [],
        Citas: [],
        Universo: { Id: 1, Nombre: 'Cosmere' },
        Saga: { Id: 1, Nombre: 'El archivo de las tormentas' },
        Orden: 1,
        Portada: ''
    };
}
