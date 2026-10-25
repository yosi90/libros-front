import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, Router, UrlSegment } from '@angular/router';
import { BehaviorSubject, NEVER, of, Subject, throwError } from 'rxjs';
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
import { PendingWorkService } from '../../../../services/auth/pending-work.service';
import { NarrativeEntityPlaceholderComponent } from './narrative-entity-placeholder.component';

describe('NarrativeEntityPlaceholderComponent', () => {
    let component: NarrativeEntityPlaceholderComponent;
    let fixture: ComponentFixture<NarrativeEntityPlaceholderComponent>;
    let bookStore: BookStoreService;
    let characterService: jasmine.SpyObj<CharacterService>;
    let narrativeService: jasmine.SpyObj<NarrativeEntityService>;
    let entryService: jasmine.SpyObj<EntryService>;
    let router: jasmine.SpyObj<Router>;
    let loader: { activateLoader: jasmine.Spy; deactivateLoader: jasmine.Spy };
    let orderRefresh: { isRefreshing$: jasmine.Spy; refresh: jasmine.Spy };
    let snackBar: { openSnackBar: jasmine.Spy; openApiError: jasmine.Spy };

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
                        get: of({ Id: 12, Nombre: 'Kaladin' } as any),
                        createAlias: of({ Id: 1 } as any),
                        createRelation: of({ Id: 1 } as any),
                        updateRelation: of({ Id: 1 } as any),
                        deleteRelation: of({} as any),
                        deleteAlias: of({} as any),
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
                { provide: SnackbarModule, useValue: { openSnackBar: jasmine.createSpy('openSnackBar'), openApiError: jasmine.createSpy('openApiError') } },
                { provide: CharacterOrderRefreshService, useValue: { isRefreshing$: jasmine.createSpy('isRefreshing$').and.returnValue(of(false)), refresh: jasmine.createSpy('refresh').and.returnValue(of([])) } }
            ]
        }).compileComponents();

        bookStore = TestBed.inject(BookStoreService);
        characterService = TestBed.inject(CharacterService) as jasmine.SpyObj<CharacterService>;
        narrativeService = TestBed.inject(NarrativeEntityService) as jasmine.SpyObj<NarrativeEntityService>;
        entryService = TestBed.inject(EntryService) as jasmine.SpyObj<EntryService>;
        router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        loader = TestBed.inject(LoaderEmmitterService) as any;
        orderRefresh = TestBed.inject(CharacterOrderRefreshService) as any;
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

    it('guarda y borra las relaciones por su RelacionId y no borra el apodo que es el nombre actual', () => {
        component.book = createBook();
        component.routePath = 'characters';
        component.formMode = 'update';
        // La API: `Id` es el personaje relacionado; `RelacionId`, la fila de la relación. Y el nombre va entre los apodos.
        const item = {
            Id: 12, Nombre: 'Kaladin',
            Relaciones: [
                { Id: 5, RelacionId: 77, PersonajeRelacionadoId: 5, Nombre: 'Tien', Parentesco: 'Hermano', Origen: 1, Orden: null, Reflejada: false },
                { Id: 6, RelacionId: 78, PersonajeRelacionadoId: 6, Nombre: 'Lirin', Parentesco: 'Padre', Origen: 1, Orden: null, Reflejada: false }
            ],
            Apodos: [
                { Id: 1, ApodoId: 40, Apodo: 'Kaladin', Origen: 1, Orden: null, Borrado: false },
                { Id: 2, ApodoId: 41, Apodo: 'Kal', Origen: 1, Orden: null, Borrado: false }
            ]
        } as any;
        component.selectedItem = item;
        (component as any).populateCharacterDrafts(item);
        component.createCharacterRelations = component.createCharacterRelations.filter(relation => relation.id !== 6);
        component.characterAliases = [];

        (component as any).syncCharacterRelationsFromForm(12).subscribe();

        expect(characterService.updateRelation).toHaveBeenCalledWith(12, 77, jasmine.objectContaining({ PersonajeRelacionadoId: 5, Parentesco: 'Hermano' }));
        expect(characterService.deleteRelation).toHaveBeenCalledOnceWith(12, 78);
        expect(characterService.deleteAlias).toHaveBeenCalledOnceWith(12, 41);
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

    it('tras un cambio de cuenta aparta los cambios de la ficha para su cuenta, no los envía y los devuelve solo a ella', () => {
        localStorage.clear();
        const pendingWork = TestBed.inject(PendingWorkService);
        const key = (component as any).entityDraftKey(30);
        (component as any).accountScope = 'desarrollo:cuenta-a';
        component.name.setValue('Honor de A');

        pendingWork.abandonAll();
        const result = component.canDeactivate();
        component.submitEntityForm();

        expect(result).toBeTrue();
        expect(narrativeService.updateConcept).not.toHaveBeenCalled();
        expect(pendingWork.take('desarrollo:cuenta-b', key)).toBeNull();
        const stashed = pendingWork.take<any>('desarrollo:cuenta-a', key);
        expect(stashed?.borrador.name).toBe('Honor de A');

        // La misma cuenta vuelve a abrir la ficha: los cambios vuelven al formulario.
        pendingWork.stash('desarrollo:cuenta-a', key, stashed!.borrador);
        pendingWork.setScope('desarrollo:cuenta-a');
        (component as any).abandoned = false;
        component.name.setValue('Honor');
        (component as any).restoreEntityDraft(30);
        expect(component.name.value).toBe('Honor de A');
        localStorage.clear();
    });

    it('aparta lo escrito en el dispositivo al ocultarse la página y lo retira cuando ya está guardado', () => {
        localStorage.clear();
        const pendingWork = TestBed.inject(PendingWorkService);
        const key = (component as any).entityDraftKey(30);
        (component as any).accountScope = 'desarrollo:cuenta-a';
        component.name.setValue('Honor a medias');

        component.onPageHide();
        expect(pendingWork.take<any>('desarrollo:cuenta-a', key)?.borrador.name).toBe('Honor a medias');

        component.onPageHide();
        (component as any).refreshUpdateSnapshot();
        (component as any).keepEntityDraft();
        expect(pendingWork.take('desarrollo:cuenta-a', key)).toBeNull();
        localStorage.clear();
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

    it('names organization participants from the book list or, if missing, from the API row', () => {
        component.book = { ...component.book, Personajes: [{ Id: 331, Nombre: 'Dalinar' } as any] };
        const relation = (PersonajeId: number, Nombre?: string) =>
            ({ OrganizacionId: 24, PersonajeId, Nombre, Descripcion: 'Alto príncipe', Origen: 3, Orden: 1 });

        expect(component.getOrganizationCharacterRelationName(relation(331, 'Otro'))).toBe('Dalinar');
        expect(component.getOrganizationCharacterRelationName(relation(605, 'Aladar'))).toBe('Aladar');
        expect(component.getOrganizationCharacterRelationName(relation(605))).toBe('Personaje 605');
    });

    it('finds organization locations even when the book list carries text ids', () => {
        component.book = { ...component.book, Localizaciones: [{ Id: '64', Nombre: 'Alezkar' } as any] };
        const relation = { OrganizacionId: 24, LocalizacionId: 64, Descripcion: 'Sede', Origen: 3, Orden: 1 };

        expect(component.getOrganizationLocationRelationName(relation)).toBe('Alezkar');
        expect(component.getOrganizationLocationRelationName({ ...relation, LocalizacionId: 70 })).toBe('Localización 70');
        expect(component.getOrganizationLocationRelationName({ ...relation, LocalizacionId: 70, Nombre: 'Kharbranth' }))
            .toBe('Kharbranth');
    });

    it('selects the location state of the list row whatever the id type', () => {
        const merged = (component as any).mergeLocationStates([], [
            { Id: '1', Nombre: 'Buen estado' },
            { Id: 2, Nombre: 'En ruinas' }
        ]);

        expect(merged.map((state: any) => state.Id)).toEqual([1, 2]);
        expect((component as any).getItemLocationStatusId({ Id_Estado: '1', Estado: 'Buen estado' })).toBe(1);
        expect((component as any).getItemLocationStatusId({ Id_Estado: 1, Estado: 'Buen estado' })).toBe(1);
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

    describe('creating characters', () => {
        // Caso real (Siega, 20/10/2026): el alta de «Segador Goodall» se guardó, el loader no
        // terminaba, la lista no lo mostraba al volver y el segundo intento lo duplicó.
        beforeEach(() => {
            queryParamMap$.next(convertToParamMap({}));
            routeUrl$.next([new UrlSegment('character', {})]);
            characterService.get.and.callFake((id: number) => of({ Id: id, Nombre: 'Segador Goodall', Sexo: 1, Entradas: [], Apodos: [], Estados: [], Relaciones: [] } as any));
            component.characterSex.setValue(1);
            component.characterStatusId.setValue(1);
            component.name.setValue('Segador Goodall');
            component.createEntryDrafts[0].description.setValue('Segador de la región de MidMérica');
            snackBar = {
                openSnackBar: spyOn((component as any).snackBar, 'openSnackBar'),
                openApiError: spyOn((component as any).snackBar, 'openApiError')
            };
            loader.activateLoader.calls.reset();
            loader.deactivateLoader.calls.reset();
            orderRefresh.refresh.calls.reset();
        });

        it('creates several characters in a row and adds each one to the list without reloading the book', () => {
            const bookService = TestBed.inject(BookService) as any;
            bookService.getBook.calls.reset();
            characterService.create.and.returnValues(
                of({ Id: 1202, Nombre: 'Segador Mandela', Estados: [{ EstadoId: 1, Origen: 1 }] } as any),
                of({ Id: 1203, Nombre: 'Segador Goodall', Estados: [{ EstadoId: 1, Origen: 1 }] } as any)
            );

            component.createEntity();
            component.name.setValue('Segador Goodall');
            component.characterSex.setValue(1);
            component.characterStatusId.setValue(1);
            component.createEntryDrafts[0].description.setValue('Segador de la región de MidMérica');
            component.createEntity();

            expect(characterService.create).toHaveBeenCalledTimes(2);
            expect(bookStore.getBook().Personajes.map(character => character.Id)).toEqual([1202, 1203]);
            expect(bookService.getBook).not.toHaveBeenCalled();
            expect(characterService.updateBookState).not.toHaveBeenCalled();
            expect(loader.deactivateLoader).toHaveBeenCalledTimes(2);
            expect(component.isSubmittingEntity).toBeFalse();
            expect(orderRefresh.refresh).toHaveBeenCalledWith(1);
        });

        it('ignores a second submit while the first creation is still waiting for the API', () => {
            const response = new Subject<any>();
            characterService.create.and.returnValue(response.asObservable());

            component.createEntity();
            component.createEntity();

            expect(characterService.create).toHaveBeenCalledTimes(1);
            expect(component.isSubmittingEntity).toBeTrue();
            response.next({ Id: 1203, Nombre: 'Segador Goodall' });
            response.complete();
            expect(component.isSubmittingEntity).toBeFalse();
            expect(loader.deactivateLoader).toHaveBeenCalled();
        });

        it('keeps the created character in the list and releases the loader when a later step fails', () => {
            characterService.create.and.returnValue(of({ Id: 1203, Nombre: 'Segador Goodall' } as any));
            characterService.updateBookState.and.returnValue(throwError(() => new Error('500')));
            component.characterStatusId.setValue(3);

            component.createEntity();

            expect(bookStore.getBook().Personajes.map(character => character.Id)).toEqual([1203]);
            expect(loader.deactivateLoader).toHaveBeenCalled();
            expect(snackBar.openSnackBar).toHaveBeenCalledWith(jasmine.stringMatching(/Personaje creado, pero no se ha podido guardar el estado/), 'errorBar');
            expect(router.navigate).toHaveBeenCalledWith(['../characters'], jasmine.anything());
        });

        it('retries with the same IdCliente after an error and starts a new one after a success', () => {
            characterService.create.and.returnValue(throwError(() => new Error('red caída')));
            component.createEntity();
            const firstId = characterService.create.calls.mostRecent().args[0].IdCliente;
            component.createEntity();
            const retryId = characterService.create.calls.mostRecent().args[0].IdCliente;

            expect(firstId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
            expect(retryId).toBe(firstId);
            expect(orderRefresh.refresh).toHaveBeenCalledWith(1);
            expect(loader.deactivateLoader).toHaveBeenCalledTimes(2);

            characterService.create.and.returnValue(of({ Id: 1203, Nombre: 'Segador Goodall' } as any));
            component.createEntity();
            component.name.setValue('Segador Colbert');
            component.characterSex.setValue(1);
            component.characterStatusId.setValue(1);
            component.createEntryDrafts[0].description.setValue('Segador de la región de MidMérica');
            component.createEntity();
            const nextId = characterService.create.calls.mostRecent().args[0].IdCliente;

            expect(nextId).not.toBe(firstId);
        });

        it('ends the loader when the API never answers and keeps the form for an idempotent retry', fakeAsync(() => {
            characterService.create.and.returnValue(NEVER);

            component.createEntity();
            tick(30_000);

            expect(component.isSubmittingEntity).toBeFalse();
            expect(loader.deactivateLoader).toHaveBeenCalled();
            expect(snackBar.openSnackBar).toHaveBeenCalledWith(jasmine.stringMatching(/no se duplicará/), 'errorBar');
            expect(orderRefresh.refresh).toHaveBeenCalledWith(1);
            expect(component.name.value).toBe('Segador Goodall');
        }));

        it('releases the loader when the screen is left during the creation and does not navigate back', () => {
            const response = new Subject<any>();
            characterService.create.and.returnValue(response.asObservable());

            component.createEntity();
            fixture.destroy();

            expect(loader.deactivateLoader).toHaveBeenCalledTimes(1);
            response.next({ Id: 1203, Nombre: 'Segador Goodall' });
            response.complete();

            expect(bookStore.getBook().Personajes.map(character => character.Id)).toEqual([1203]);
            expect(loader.deactivateLoader).toHaveBeenCalledTimes(1);
            expect(router.navigate).not.toHaveBeenCalledWith(['../characters'], jasmine.anything());
        });

        it('no envía con la cuenta nueva lo que falta del alta si la cuenta cambia mientras se crea', () => {
            const pendingWork = TestBed.inject(PendingWorkService);
            pendingWork.setScope('desarrollo:cuenta-a');
            const response = new Subject<any>();
            characterService.create.and.returnValue(response.asObservable());
            component.characterStatusId.setValue(3);

            component.createEntity();
            fixture.destroy();
            pendingWork.abandonAll();
            pendingWork.setScope('desarrollo:cuenta-b');
            response.next({ Id: 1203, Nombre: 'Segador Goodall', Estados: [{ EstadoId: 1, Origen: 1 }] });
            response.complete();

            expect(characterService.updateBookState).not.toHaveBeenCalled();
            expect(orderRefresh.refresh).not.toHaveBeenCalled();
            expect(component.isSubmittingEntity).toBeFalse();
            pendingWork.setScope(null);
        });

        it('asks before creating a character whose name is already in the book', () => {
            bookStore.setBook({ ...createBook(), Personajes: [{ Id: 1203, Nombre: 'Segador Goodall', Sexo: 1, Entradas: [], Apodos: [], Estados: [], Relaciones: [] }] });
            const confirm = spyOn(window, 'confirm').and.returnValue(false);

            component.createEntity();

            expect(confirm).toHaveBeenCalledWith(jasmine.stringMatching(/Ya hay un personaje llamado «Segador Goodall»/));
            expect(characterService.create).not.toHaveBeenCalled();
            expect(loader.activateLoader).not.toHaveBeenCalled();
        });

        it('checks the list against the API when coming back to the characters list', () => {
            routeUrl$.next([new UrlSegment('characters', {})]);

            expect(orderRefresh.refresh).toHaveBeenCalledWith(1);
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
