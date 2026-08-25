import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Book } from '../../../../interfaces/book';
import { ChapterService } from '../../../../services/entities/chapter.service';
import { SceneService } from '../../../../services/entities/scene.service';
import { BookEmmitterService } from '../../../../services/emmitters/bookEmmitter.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { CharacterOrderRefreshService } from '../../../../services/stores/character-order-refresh.service';
import { NarrativeEditorFontPreferenceService } from '../../../../services/preferences/narrative-editor-font-preference.service';
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
                { provide: BookEmmitterService, useValue: { updateBook: jasmine.createSpy('updateBook') } },
                { provide: SnackbarModule, useValue: { openSnackBar: jasmine.createSpy('openSnackBar') } },
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

    it('requires a present character when an existing chapter is edited', () => {
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
