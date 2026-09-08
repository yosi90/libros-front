import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
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
import { rtfToPlainText } from '../../../../shared/rtf/rtf-text';
import { NarrativeEntityPlaceholderComponent } from './narrative-entity-placeholder.component';

describe('NarrativeEntityPlaceholderComponent', () => {
    let component: NarrativeEntityPlaceholderComponent;
    let fixture: ComponentFixture<NarrativeEntityPlaceholderComponent>;
    let bookStore: BookStoreService;
    let characterService: jasmine.SpyObj<CharacterService>;
    let narrativeService: jasmine.SpyObj<NarrativeEntityService>;
    let entryService: jasmine.SpyObj<EntryService>;
    let router: jasmine.SpyObj<Router>;

    const routeUrl$ = new BehaviorSubject<UrlSegment[]>([new UrlSegment('concepts', {})]);
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({ selected: '30' }));

    beforeEach(async () => {
        routeUrl$.next([new UrlSegment('concepts', {})]);
        queryParamMap$.next(convertToParamMap({ selected: '30' }));
        await TestBed.configureTestingModule({
            imports: [NarrativeEntityPlaceholderComponent],
            providers: [
                provideHttpClient(withXhr()),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        url: routeUrl$.asObservable(),
                        paramMap: of(convertToParamMap({})),
                        queryParamMap: queryParamMap$.asObservable(),
                        snapshot: { routeConfig: { path: 'concepts' }, paramMap: convertToParamMap({}) }
                    }
                },
                { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
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
        router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
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

    it('returns from a creation route to its entity list', () => {
        component.routePath = 'concept';
        component.requestCloseUpdateForm();

        expect(router.navigate).toHaveBeenCalledWith(['../concepts'], jasmine.objectContaining({ relativeTo: jasmine.anything() }));
    });

    it('selects Sin localización as the initial event autocomplete option', () => {
        component.book = {
            ...createBook(),
            Localizaciones: [
                { Id: 8, Nombre: 'Urithiru', Entradas: [] },
                { Id: 4, Nombre: 'Sin localización', Entradas: [] }
            ]
        };
        component.routePath = 'event';
        component.locationId.reset();

        (component as any).selectDefaultEventLocation();

        expect(component.locationId.value).toBe(4);
        expect((component.eventLocationSearch.value as any).Nombre).toBe('Sin localización');
    });

    it('keeps the quote character autocomplete bound to a canonical character id', () => {
        const character = { Id: 12, Nombre: 'Kaladin' } as any;

        component.selectQuoteCharacter(character);

        expect(component.characterId.value).toBe(12);
        expect(component.quoteCharacterSearch.value).toBe(character);
    });

    it('creates each narrative entry with its canonical selectable description', () => {
        const cases = [
            ['character', 'Descripción del personaje'],
            ['location', 'Descripción de la localización'],
            ['organization', 'Descripción de la organización'],
            ['event', 'Descripción del evento'],
            ['concept', 'Descripción del concepto'],
            ['quote', 'Descripción de la cita']
        ];

        cases.forEach(([routePath, expected]) => {
            component.routePath = routePath;
            (component as any).resetCreateForm();

            expect(rtfToPlainText(component.createEntryDrafts[0].description.value ?? '').trim()).toBe(expected);
            expect(component.isDefaultEntryDescription(component.createEntryDrafts[0])).toBeTrue();
        });
    });

    it('uses the same canonical defaults when another entry is added', () => {
        component.routePath = 'event';
        (component as any).resetCreateForm();

        component.addCreateEntry();

        expect(component.createEntryDrafts).toHaveSize(2);
        expect(component.createEntryDrafts[1].title.value).toBe('Descripción');
        expect(rtfToPlainText(component.createEntryDrafts[1].description.value ?? '').trim())
            .toBe('Descripción del evento');
    });

    it('does not add another entry until every existing entry is valid', () => {
        const notice = spyOn((component as any).snackBar, 'openSnackBar');
        component.routePath = 'event';
        (component as any).resetCreateForm();
        component.createEntryDrafts[0].title.setValue('');

        expect(component.addCreateEntry()).toBeFalse();

        expect(component.createEntryDrafts).toHaveSize(1);
        expect(component.createEntryDrafts[0].title.touched).toBeTrue();
        expect(notice).toHaveBeenCalledWith(
            jasmine.stringMatching(/entradas existentes deben ser válidas/),
            'infoBar',
            4200,
            jasmine.objectContaining({ icon: 'help_outline' })
        );
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
