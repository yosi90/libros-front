import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, UrlSegment } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { BookService } from '../../../../services/entities/book.service';
import { CharacterService } from '../../../../services/entities/character.service';
import { EntryService } from '../../../../services/entities/entry.service';
import { NarrativeEntityService } from '../../../../services/entities/narrative-entity.service';
import { LoaderEmmitterService } from '../../../../services/emmitters/loader.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { CharacterOrderRefreshService } from '../../../../services/stores/character-order-refresh.service';
import { NarrativeEntityPlaceholderComponent } from './narrative-entity-placeholder.component';

describe('NarrativeEntityPlaceholderComponent', () => {
    let component: NarrativeEntityPlaceholderComponent;
    let fixture: ComponentFixture<NarrativeEntityPlaceholderComponent>;
    let bookStore: BookStoreService;

    const routeUrl$ = new BehaviorSubject<UrlSegment[]>([new UrlSegment('concepts', {})]);
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({ selected: '30' }));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NarrativeEntityPlaceholderComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        url: routeUrl$.asObservable(),
                        queryParamMap: queryParamMap$.asObservable(),
                        snapshot: { routeConfig: { path: 'concepts' } }
                    }
                },
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
                { provide: BookService, useValue: { getBook: jasmine.createSpy('getBook').and.returnValue(of(createBook())) } },
                {
                    provide: NarrativeEntityService,
                    useValue: {
                        getLocationStates: jasmine.createSpy('getLocationStates').and.returnValue(of([])),
                        getOrganizationCharacters: jasmine.createSpy('getOrganizationCharacters').and.returnValue(of([])),
                        getOrganizationLocations: jasmine.createSpy('getOrganizationLocations').and.returnValue(of([]))
                    }
                },
                { provide: CharacterService, useValue: { getStateCatalog: jasmine.createSpy('getStateCatalog').and.returnValue(of([])) } },
                { provide: EntryService, useValue: { list: jasmine.createSpy('list').and.returnValue(of([])) } },
                { provide: LoaderEmmitterService, useValue: { activateLoader: jasmine.createSpy('activateLoader'), deactivateLoader: jasmine.createSpy('deactivateLoader') } },
                { provide: SnackbarModule, useValue: { openSnackBar: jasmine.createSpy('openSnackBar') } },
                { provide: CharacterOrderRefreshService, useValue: { isRefreshing$: jasmine.createSpy('isRefreshing$').and.returnValue(of(false)) } }
            ]
        }).compileComponents();

        bookStore = TestBed.inject(BookStoreService);
        bookStore.setBook(createBook());
        fixture = TestBed.createComponent(NarrativeEntityPlaceholderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('opens a generic entity selected from query params', () => {
        expect(Number(component.selectedItem?.Id)).toBe(30);
        expect(component.formMode).toBe('update');
        expect(component.selectedItem?.Nombre).toBe('Honor');
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
        Personajes: [],
        Localizaciones: [],
        Conceptos: [{ Id: '30' as any, Nombre: 'Honor', Entradas: [] }],
        Organizaciones: [],
        Eventos: [],
        Citas: [],
        Universo: { Id: 1, Nombre: 'Cosmere' },
        Saga: { Id: 1, Nombre: 'El archivo de las tormentas' },
        Orden: 1,
        Portada: ''
    };
}
