import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
    let characterService: jasmine.SpyObj<CharacterService>;
    let narrativeService: jasmine.SpyObj<NarrativeEntityService>;
    let entryService: jasmine.SpyObj<EntryService>;

    const routeUrl$ = new BehaviorSubject<UrlSegment[]>([new UrlSegment('concepts', {})]);
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({ selected: '30' }));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NarrativeEntityPlaceholderComponent],
            providers: [
                provideHttpClient(),
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
                    useValue: jasmine.createSpyObj<NarrativeEntityService>('NarrativeEntityService', {
                        getLocationStates: of([]),
                        getOrganizationCharacters: of([]),
                        getOrganizationLocations: of([]),
                        updateConcept: of({ Id: 30 } as any)
                    })
                },
                {
                    provide: CharacterService,
                    useValue: jasmine.createSpyObj<CharacterService>('CharacterService', {
                        getStateCatalog: of([]),
                        create: of({ Id: 12 } as any),
                        updateBookState: of({ Id: 1 } as any),
                        createState: of({ Id: 1 } as any),
                        updateRoot: of({ Id: 12 } as any),
                        changeNarrativeAlias: of({ Id: 12 } as any),
                        correctAlias: of({ Id: 12 } as any)
                    })
                },
                {
                    provide: EntryService,
                    useValue: jasmine.createSpyObj<EntryService>('EntryService', {
                        list: of([]),
                        create: of([])
                    })
                },
                { provide: LoaderEmmitterService, useValue: { activateLoader: jasmine.createSpy('activateLoader'), deactivateLoader: jasmine.createSpy('deactivateLoader') } },
                { provide: SnackbarModule, useValue: { openSnackBar: jasmine.createSpy('openSnackBar') } },
                { provide: CharacterOrderRefreshService, useValue: { isRefreshing$: jasmine.createSpy('isRefreshing$').and.returnValue(of(false)) } }
            ]
        }).compileComponents();

        bookStore = TestBed.inject(BookStoreService);
        characterService = TestBed.inject(CharacterService) as jasmine.SpyObj<CharacterService>;
        narrativeService = TestBed.inject(NarrativeEntityService) as jasmine.SpyObj<NarrativeEntityService>;
        entryService = TestBed.inject(EntryService) as jasmine.SpyObj<EntryService>;
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

    it('upserts the initial character state after creating the character', () => {
        const payload = {
            LibroId: 1,
            Nombre: 'Kaladin',
            Entradas: [{ Nombre: 'Descripción', Descripcion: 'Descripción suficientemente larga' }]
        };
        component.characterStatusId.setValue(3);
        component.characterSex.setValue(0);

        (component as any).createCharacterWithDetails(payload).subscribe();

        expect(characterService.create).toHaveBeenCalled();
        expect(characterService.updateBookState).toHaveBeenCalledWith(12, 1, { EstadoId: 3 });
        expect(characterService.createState).not.toHaveBeenCalled();
    });

    it('uses a narrative alias change by default so the previous name remains as an alias', () => {
        component.book = createBook();
        component.routePath = 'characters';
        component.formMode = 'update';
        component.selectedItem = { Id: 12, Nombre: 'Kaladin' };
        component.name.setValue('Bendito por la tormenta');
        component.characterSex.setValue(0);
        component.characterStatusId.setValue(3);
        component.characterNameChangeMode.setValue('narrative');

        (component as any).updateCharacterFromMainForm().subscribe();

        expect(characterService.changeNarrativeAlias).toHaveBeenCalledWith(12, 1, { Apodo: 'Bendito por la tormenta' });
        expect(characterService.correctAlias).not.toHaveBeenCalled();
    });

    it('autosaves the entity and its entries before leaving the route', done => {
        component.name.setValue('Honor renovado');
        component.createEntryDrafts[0].description.setValue('Descripción con contenido suficientemente largo');

        const result = component.canDeactivate();

        expect(typeof result).not.toBe('boolean');
        (result as any).subscribe((allowed: boolean) => {
            expect(allowed).toBeTrue();
            expect(narrativeService.updateConcept).toHaveBeenCalledWith(30, {
                LibroId: 1,
                Nombre: 'Honor renovado'
            });
            expect(entryService.create).toHaveBeenCalled();
            done();
        });
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
