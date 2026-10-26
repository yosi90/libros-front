import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { NEVER, of } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { ChapterService } from '../../../../services/entities/chapter.service';
import { SceneService } from '../../../../services/entities/scene.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { CharacterOrderRefreshService } from '../../../../services/stores/character-order-refresh.service';
import { NarrativeEditorFontPreferenceService } from '../../../../services/preferences/narrative-editor-font-preference.service';
import { PendingWorkService } from '../../../../services/auth/pending-work.service';
import { PresentationModeService, PresentationState } from '../../../../services/ui/presentation-mode.service';
import { ChapterComponent } from './chapter.component';

describe('ChapterComponent', () => {
    let fixture: ComponentFixture<ChapterComponent>;
    let component: ChapterComponent;
    let bookStore: BookStoreService;
    let chapterService: jasmine.SpyObj<ChapterService>;
    let sceneService: jasmine.SpyObj<SceneService>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChapterComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({}),
                        snapshot: { routeConfig: { path: 'chapter' } }
                    }
                },
                { provide: Router, useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) } },
                {
                    provide: ChapterService,
                    useValue: jasmine.createSpyObj<ChapterService>('ChapterService', {
                        createForBook: of({ Id: 91, Nombre: 'Capítulo 1', Orden: 1, Pagina: 1, PaginaFinal: 1, Escenas: [] }),
                        update: of({ Id: 91, Nombre: 'Capítulo 1', Orden: 1, Pagina: 1, PaginaFinal: 1, Escenas: [] })
                    })
                },
                {
                    provide: SceneService,
                    useValue: jasmine.createSpyObj<SceneService>('SceneService', ['createForChapter', 'createForInterludeChapter', 'update', 'delete'])
                },
                { provide: SnackbarModule, useValue: { openSnackBar: jasmine.createSpy('openSnackBar'), openApiError: jasmine.createSpy('openApiError') } },
                {
                    provide: CharacterOrderRefreshService,
                    useValue: { isRefreshing$: jasmine.createSpy('isRefreshing$').and.returnValue(of(false)), refresh: jasmine.createSpy('refresh') }
                },
                { provide: NarrativeEditorFontPreferenceService, useValue: { preferredFont: jasmine.createSpy('preferredFont').and.returnValue('Arial') } }
            ]
        }).compileComponents();

        bookStore = TestBed.inject(BookStoreService);
        chapterService = TestBed.inject(ChapterService) as jasmine.SpyObj<ChapterService>;
        sceneService = TestBed.inject(SceneService) as jasmine.SpyObj<SceneService>;
        bookStore.setBook(createBook());
        fixture = TestBed.createComponent(ChapterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('creates an acceptable chapter without posting its characterless default scene', () => {
        component.setChapter();

        expect(chapterService.createForBook).toHaveBeenCalledWith(1, {
            Nombre: 'Capítulo 1',
            Pagina: 1,
            PaginaFinal: 1,
            Orden: 1
        });
        expect(sceneService.createForChapter).not.toHaveBeenCalled();
        expect(component.chapter.Id).toBe(91);
        expect(bookStore.getBook().Capitulos.some(chapter => chapter.Id === 91)).toBeTrue();
    });

    it('copies the initial page to the final page when the range is empty or inverted', () => {
        component.page.setValue('40');
        component.endPage.setValue('20');

        component.syncEndPageFromStart();

        expect(component.endPage.value).toBe('40');
    });

    it('copies the final page to the initial page when the final value is lower', () => {
        component.page.setValue('40');
        component.endPage.setValue('20');

        component.syncStartPageFromEnd();

        expect(component.page.value).toBe('20');
    });

    it('requires an assigned character when an existing chapter is edited', () => {
        component.chapter.Id = 91;

        component.setChapter();

        expect(chapterService.update).not.toHaveBeenCalled();
        expect(component.autosaveStatus).not.toBe('saving');
    });

    it('keeps assigned scene characters alphabetically ordered', () => {
        component.book.Personajes = [
            { Id: 20, Nombre: 'Zelda' } as any,
            { Id: 10, Nombre: 'Ágata' } as any
        ];
        const scene = component.scenesControls.at(0);

        component.assignCharacterById(scene, '20', false);
        component.assignCharacterById(scene, '10', false);

        expect(component.getSceneCharactersByMention(scene, false).map(control => control.get('Nombre')?.value))
            .toEqual(['Ágata', 'Zelda']);
    });

    it('uses Sin localización for a new scene even when it is not the first option', () => {
        component.book.Localizaciones = [
            { Id: 8, Nombre: 'Urithiru', Entradas: [] },
            { Id: 4, Nombre: 'Sin localización', Entradas: [] }
        ];

        const scene = component.createSceneGroup(undefined, 2);

        expect(scene.get('localizacion')?.value).toBe(4);
    });

    it('normalizes serialized location ids and always displays their name', () => {
        component.book.Localizaciones = [
            { Id: 8, Nombre: 'Urithiru', Entradas: [] },
            { Id: 4, Nombre: 'Sin localización', Entradas: [] }
        ] as any;

        const scene = component.createSceneGroup({ Localizacion: { Id: '8' } } as any, 2);

        expect(scene.get('localizacion')?.value).toBe(8);
        expect(component.displaySceneLocation('8')).toBe('Urithiru');
        expect(component.getSceneLocationOptionId(component.book.Localizaciones[0])).toBe(8);
    });

    it('does not add another scene until every existing scene is valid', () => {
        const notice = spyOn((component as any)._snackBar, 'openSnackBar');
        const scene = component.scenesControls.at(0);
        scene.get('nombre')?.setValue('');
        const previousCount = component.scenesControls.length;

        expect(component.addScene()).toBeFalse();

        expect(component.scenesControls.length).toBe(previousCount);
        expect(scene.get('nombre')?.touched).toBeTrue();
        expect(notice).toHaveBeenCalledWith(
            jasmine.stringMatching(/escenas existentes deben ser válidas/),
            'infoBar',
            4200,
            jasmine.objectContaining({ icon: 'help_outline' })
        );
    });

    it('does not treat an acceptable characterless scene as valid for adding another one', () => {
        const scene = component.scenesControls.at(0);

        expect(component.chapter.Id).toBe(0);
        expect(scene.valid).toBeTrue();
        expect(component.canAddScene()).toBeFalse();
        expect(component.addScene()).toBeFalse();
        expect(component.scenesControls.length).toBe(1);
    });

    it('allows another scene when the existing one has only a named character', () => {
        component.book.Personajes = [{ Id: 10, Nombre: 'Ágata' } as any];
        const scene = component.scenesControls.at(0);
        component.assignCharacterById(scene, 10, true);

        expect(component.isSceneValid(scene as FormGroup)).toBeTrue();
        expect(component.addScene()).toBeTrue();
        expect(component.scenesControls.length).toBe(2);
    });

    it('filters scene locations without accents and rejects free text', () => {
        component.book.Localizaciones = [
            { Id: 8, Nombre: 'Último hogar', Entradas: [] },
            { Id: 4, Nombre: 'Sin localización', Entradas: [] }
        ] as any;
        const scene = component.createSceneGroup(undefined, 2);

        scene.get('localizacion')?.setValue('ultimo');

        expect(component.getFilteredSceneLocations(scene).map(location => location.Id)).toEqual([8]);
        expect(scene.get('localizacion')?.hasError('locationSelection')).toBeTrue();
    });

    it('does not invent a fallback location when Sin localización is absent', () => {
        component.book.Localizaciones = [{ Id: 8, Nombre: 'Urithiru', Entradas: [] }] as any;

        const scene = component.createSceneGroup(undefined, 2);

        expect(scene.get('localizacion')?.value).toBe('');
        expect(scene.get('localizacion')?.invalid).toBeTrue();
        expect(component.hasCanonicalSceneLocation()).toBeFalse();
    });

    it('filters only unassigned scene characters for the autocompletes', () => {
        component.book.Personajes = [
            { Id: 20, Nombre: 'Zelda' } as any,
            { Id: 10, Nombre: 'Ágata' } as any
        ];
        const scene = component.scenesControls.at(0);
        component.assignCharacterById(scene, 20, false);

        expect(component.getFilteredAvailableSceneCharacters(scene, 'agata').map(character => character.Id))
            .toEqual([10]);
        expect(component.getFilteredAvailableSceneCharacters(scene, 'zelda')).toEqual([]);
    });

    it('autosaves chapter and scene changes before leaving the route', done => {
        component.book.Personajes = [{ Id: 10, Nombre: 'Ágata' } as any];
        component.chapter.Id = 91;
        component.name.setValue('Capítulo revisado');
        component.assignCharacterById(component.scenesControls.at(0), '10', false);
        sceneService.createForChapter.and.returnValue(of({ Id: 301 } as any));

        const result = component.canDeactivate();

        expect(typeof result).not.toBe('boolean');
        (result as any).subscribe((allowed: boolean) => {
            expect(allowed).toBeTrue();
            expect(chapterService.update).toHaveBeenCalled();
            expect(sceneService.createForChapter).toHaveBeenCalled();
            done();
        });
    });

    // Opción A del propietario (26/10/2026): el capítulo compacto, como en la APK (3118bc0).
    describe('capítulo compacto', () => {
        let activeMode: 'web' | 'mobile' = 'web';
        const host = () => fixture.nativeElement as HTMLElement;
        const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

        beforeEach(() => {
            const presentation = TestBed.inject(PresentationModeService);
            const real = presentation.snapshot;
            activeMode = 'web';
            spyOnProperty(presentation, 'snapshot', 'get').and.callFake(() => ({
                ...real, activeMode, isMobilePresentationActive: activeMode === 'mobile', isWoodPresentationActive: false
            } as PresentationState));
            component.book.Personajes = [
                { Id: 20, Nombre: 'Zelda' } as any,
                { Id: 10, Nombre: 'Ágata' } as any,
                { Id: 30, Nombre: 'Bruno' } as any
            ];
        });

        function saveChapter(): void {
            component.chapter = { ...component.chapter, Id: 91 };
            component.name.setValue('Indiscreciones');
            component.page.setValue('145');
            component.endPage.setValue('151');
            component.order.setValue('11');
        }

        it('resume los datos en una línea, con «pág.» si empieza y acaba en la misma', () => {
            saveChapter();

            expect(component.getChapterSummary()).toBe('Indiscreciones · págs. 145–151 · nº 11');
            component.endPage.setValue('145');
            expect(component.getChapterSummary()).toBe('Indiscreciones · pág. 145 · nº 11');
            component.endPage.setValue('');
            expect(component.getChapterSummary()).toBe('Indiscreciones · pág. 145 · nº 11');
        });

        it('pliega solo un capítulo guardado y sin errores, y lo despliega al tocarlo', () => {
            expect(component.isChapterSummaryVisible()).withContext('nuevo').toBeFalse();

            saveChapter();
            expect(component.isChapterSummaryVisible()).toBeTrue();

            component.name.setValue('');
            expect(component.isChapterSummaryVisible()).withContext('con errores').toBeFalse();
            component.name.setValue('Indiscreciones');
            component.endPage.setValue('140');
            expect(component.isChapterSummaryVisible()).withContext('página final menor').toBeFalse();
            component.endPage.setValue('151');

            component.openChapterFields();
            expect(component.isChapterSummaryVisible()).toBeFalse();
            component.chapter = { ...component.chapter, Id: 92 };
            expect(component.isChapterSummaryVisible()).withContext('otro capítulo').toBeTrue();
        });

        it('enseña el contador del título solo desde 180 caracteres', () => {
            component.name.setValue('x'.repeat(179));
            expect(component.shouldShowNameCounter()).toBeFalse();
            component.name.setValue('x'.repeat(180));
            expect(component.shouldShowNameCounter()).toBeTrue();
        });

        it('pone en una fila primero a los presentes y después a los solo nombrados', () => {
            const scene = component.scenesControls.at(0);
            component.assignCharacterById(scene, 20, true);
            component.assignCharacterById(scene, 30, false);
            component.assignCharacterById(scene, 10, true);

            expect(component.getSceneCharactersInRow(scene).map(control => control.get('Nombre')?.value)).toEqual(['Bruno', 'Ágata', 'Zelda']);
        });

        it('«+ Personaje» añade en escena al tocar el nombre o como solo nombrado con la @, y se cierra', () => {
            const scene = component.scenesControls.at(0);
            component.openCharacterPicker(0);
            component.characterPickerQuery.setValue('ag');
            expect(component.getCharacterPickerOptions(scene).map(character => character.Nombre)).toEqual(['Ágata']);

            component.pickSceneCharacter(0, 10, false);
            expect(component.characterPickerSceneIndex).toBeNull();
            expect(component.characterPickerQuery.value).toBe('');
            component.openCharacterPicker(0);
            component.pickSceneCharacter(0, 20, true);

            expect(component.getSelectedSceneCharacters(scene as FormGroup)).toEqual([{ Id: 10, Nombrado: false }, { Id: 20, Nombrado: true }]);
        });

        it('al soltar en la fila conserva si estaba en escena o nombrado, y no cambia nada en su propia fila', () => {
            const scene = component.scenesControls.at(0) as FormGroup;
            const list = {};
            component.dropCharacterInScene({ previousContainer: {}, container: list, item: { data: { Id: 20, Nombre: 'Zelda', Nombrado: true } } } as any, 0);
            component.dropCharacterInScene({ previousContainer: {}, container: list, item: { data: { Id: 10, Nombre: 'Ágata', Nombrado: false } } } as any, 0);
            component.dropCharacterInScene({ previousContainer: list, container: list, item: { data: { Id: 20, Nombre: 'Zelda', Nombrado: false } } } as any, 0);

            expect(component.getSelectedSceneCharacters(scene)).toEqual([{ Id: 10, Nombrado: false }, { Id: 20, Nombrado: true }]);
        });

        for (const mode of ['web', 'mobile'] as const) {
            it(`se ve compacto en ${mode === 'web' ? 'Web' : 'Mobile'}`, () => {
                activeMode = mode;
                saveChapter();
                const scene = component.scenesControls.at(0);
                component.assignCharacterById(scene, 30, false);
                component.assignCharacterById(scene, 20, true);
                fixture.detectChanges();

                const summary = host().querySelector<HTMLButtonElement>(mode === 'web' ? '.chapter__summary' : '.m-chapter__summary');
                expect(text(summary)).toContain('Indiscreciones · págs. 145–151 · nº 11');
                expect(host().querySelector('input[aria-label="Título del capítulo"], .m-chapter__name')).toBeNull();
                expect(text(host())).not.toContain('En escena');
                expect(text(host())).not.toContain('Solo nombrados');
                expect(text(host())).not.toMatch(/Escena 1/i);
                const sceneTitle = host().querySelector<HTMLInputElement>('input[aria-label="Título de la escena 1"]');
                expect(sceneTitle?.placeholder).toBe('Título de la escena');
                expect(host().querySelector('input[aria-label="Localización"]')?.getAttribute('placeholder')).toBe('Localización');
                expect(host().querySelector('.rtf-toolbar')).withContext('la barra, solo al escribir').toBeNull();

                const chips = [...host().querySelectorAll(mode === 'web' ? '.chip:not(.chip--add) .chip__name' : '.m-scene__chips > div > span')].map(text);
                expect(chips).toEqual(['Bruno', '· Zelda']);
                const add = [...host().querySelectorAll<HTMLButtonElement>('button')].find(button => text(button).endsWith('Personaje') && button.getAttribute('aria-haspopup') === 'dialog');
                expect(add).withContext('+ Personaje').toBeDefined();

                add!.click();
                fixture.detectChanges();
                const menu = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Añadir personaje"]');
                expect(text(menu)).toContain('Toca el nombre si está en escena, o la @ si solo se le nombra.');
                expect(menu?.querySelector('input[aria-label="Buscar personaje"]')).not.toBeNull();
                menu!.querySelector<HTMLButtonElement>('button[aria-label="Añadir a Ágata como solo nombrado"]')!.click();
                fixture.detectChanges();
                expect(component.getSelectedSceneCharacters(scene as FormGroup)).toContain({ Id: 10, Nombrado: true });
                expect(document.querySelector('[role="dialog"][aria-label="Añadir personaje"]')).toBeNull();

                summary!.click();
                fixture.detectChanges();
                expect(host().querySelector(mode === 'web' ? '.chapter__title' : '.m-chapter__name input')).not.toBeNull();
            });
        }

        it('avisa si a la escena de un capítulo guardado le falta un personaje', () => {
            saveChapter();
            fixture.detectChanges();

            expect(text(host())).toContain('Necesita al menos un personaje presente o nombrado.');
        });
    });

    describe('con un cambio de cuenta (CAMBIO_DE_CUENTA.md)', () => {
        const scopeA = 'desarrollo:cuenta-a';
        let pendingWork: PendingWorkService;

        beforeEach(() => {
            localStorage.clear();
            pendingWork = TestBed.inject(PendingWorkService);
        });
        afterEach(() => localStorage.clear());

        it('aparta para la cuenta que los escribió los cambios sin enviar y no los guarda con la nueva', () => {
            (component as any).accountScope = scopeA;
            component.book.Personajes = [{ Id: 10, Nombre: 'Ágata' } as any];
            component.chapter.Id = 91;
            component.name.setValue('Capítulo de A');
            component.assignCharacterById(component.scenesControls.at(0), '10', false);

            pendingWork.abandonAll();
            const result = component.canDeactivate();
            component.flushAutosave();
            component.setChapter();

            expect(result).toBeTrue();
            expect(chapterService.update).not.toHaveBeenCalled();
            expect(chapterService.createForBook).not.toHaveBeenCalled();
            expect(sceneService.createForChapter).not.toHaveBeenCalled();
            expect(pendingWork.take<any>('desarrollo:cuenta-b', 'capitulo:1:capitulo:91')).toBeNull();
            expect(pendingWork.take<any>(scopeA, 'capitulo:1:capitulo:91')?.borrador.form.name).toBe('Capítulo de A');
        });

        it('devuelve los cambios apartados solo a la misma cuenta al volver a abrir el capítulo', () => {
            pendingWork.stash(scopeA, 'capitulo:1:capitulo:nuevo', {
                form: { name: 'Capítulo recuperado', order: '1', page: '3', endPage: '9', scenes: [] },
                deletedSceneIds: []
            });

            pendingWork.setScope('desarrollo:cuenta-b');
            (component as any).syncChapterFromBook();
            expect(component.name.value).toBe('Capítulo 1');

            pendingWork.setScope(scopeA);
            (component as any).syncChapterFromBook();
            expect(component.name.value).toBe('Capítulo recuperado');
            expect(component.endPage.value).toBe('9');
            expect(component.scenesControls.length).toBe(1);
            // Se queda en el dispositivo hasta que el servidor lo tenga.
            expect(pendingWork.take<any>(scopeA, 'capitulo:1:capitulo:nuevo')?.borrador.form.name).toBe('Capítulo recuperado');
        });
    });

    describe('el borrador local (que la app se cierre no pierde lo escrito)', () => {
        const scope = 'desarrollo:cuenta-a';
        let pendingWork: PendingWorkService;

        beforeEach(() => {
            localStorage.clear();
            pendingWork = TestBed.inject(PendingWorkService);
            (component as any).accountScope = scope;
            component.book.Personajes = [{ Id: 10, Nombre: 'Ágata' } as any];
            component.chapter.Id = 91;
            component.assignCharacterById(component.scenesControls.at(0), '10', false);
        });
        afterEach(() => localStorage.clear());

        it('al ocultarse la página aparta lo escrito al momento y lo envía sin esperar', () => {
            chapterService.update.and.returnValue(NEVER);
            component.name.setValue('Capítulo a medias');

            component.onPageHide();

            expect(pendingWork.take<any>(scope, 'capitulo:1:capitulo:91')?.borrador.form.name).toBe('Capítulo a medias');
            expect(chapterService.update).toHaveBeenCalled();
        });

        it('retira el borrador cuando el servidor ya tiene los cambios', () => {
            sceneService.createForChapter.and.returnValue(of({ Id: 301 } as any));
            component.name.setValue('Capítulo 1');

            component.onPageHide();

            expect(chapterService.update).toHaveBeenCalled();
            expect(pendingWork.take(scope, 'capitulo:1:capitulo:91')).toBeNull();
        });

        it('un capítulo nuevo que recibe su id no deja atrás el borrador de «nuevo»', () => {
            component.chapter.Id = 0;
            component.name.setValue('Capítulo nuevo');
            (component as any).keepLocalDraft();
            expect(localStorage.getItem(`libros:pendiente:${scope}:capitulo:1:capitulo:nuevo`)).not.toBeNull();

            component.chapter.Id = 91;
            (component as any).keepLocalDraft();

            expect(pendingWork.take(scope, 'capitulo:1:capitulo:nuevo')).toBeNull();
            expect(pendingWork.take<any>(scope, 'capitulo:1:capitulo:91')?.borrador.form.name).toBe('Capítulo nuevo');
        });
    });
});

function createBook(): Book {
    return {
        Id: 1,
        Nombre: 'Libro',
        Estados: [],
        Autores: [],
        Capitulos: [],
        Partes: [],
        Interludios: [],
        Personajes: [],
        Localizaciones: [{ Id: 4, Nombre: 'Sin localización', Entradas: [], Estados: [] }],
        Conceptos: [],
        Organizaciones: [],
        Eventos: [],
        Citas: [],
        Universo: { Id: 1, Nombre: 'Universo' },
        Saga: { Id: 1, Nombre: 'Saga' },
        Orden: 1,
        Portada: ''
    };
}
