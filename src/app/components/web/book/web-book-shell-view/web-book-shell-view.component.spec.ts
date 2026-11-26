import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';

import { WebBookShellViewComponent } from './web-book-shell-view.component';
import type { BookComponent } from '../../../shared/book-pages/book/book.component';
import { BookElementTypePreferenceService } from '../../../../services/preferences/book-element-type-preference.service';

describe('WebBookShellViewComponent', () => {
    let fixture: ComponentFixture<WebBookShellViewComponent>;
    let controller: Record<string, unknown>;
    let url: string;
    let elementType: { listRoute: string; remember: jasmine.Spy };

    function render(route: string): void {
        url = route;
        fixture = TestBed.createComponent(WebBookShellViewComponent);
        fixture.componentInstance.controller = controller as unknown as BookComponent;
        fixture.detectChanges();
    }

    const query = <T extends Element>(selector: string) => fixture.nativeElement.querySelector(selector) as T;
    const queryAll = <T extends Element>(selector: string) => [...fixture.nativeElement.querySelectorAll(selector)] as T[];

    beforeEach(async () => {
        elementType = { listRoute: 'quotes', remember: jasmine.createSpy('remember') };
        await TestBed.configureTestingModule({
            imports: [WebBookShellViewComponent],
            providers: [provideHttpClient(), provideRouter([]), { provide: BookElementTypePreferenceService, useValue: elementType }]
        }).compileComponents();

        spyOnProperty(TestBed.inject(Router), 'url', 'get').and.callFake(() => url);

        const first = { Id: 3, Nombre: 'El faro', Orden: 1, Pagina: 1 };
        const second = { Id: 4, Nombre: 'La bruma', Orden: 2, Pagina: 15 };
        controller = {
            book: {
                Id: 7, Nombre: 'Libro de prueba', Portada: '', Autores: [{ Id: 1, Nombre: 'Ada' }, { Id: 2, Nombre: 'Bea' }], Partes: [],
                Capitulos: [first, second], Personajes: [{ Id: 1 }, { Id: 2 }], Citas: [{ Id: 9 }]
            },
            bookIndexOpen: true,
            isDesktopLayout: true,
            structureEditorKind: null,
            isSavingRunningStatus: false,
            // El índice va del último capítulo al primero.
            displayList: [{ type: 'chapter', data: second }, { type: 'chapter', data: first }],
            backToLibrary: jasmine.createSpy('backToLibrary'),
            toggleBookIndex: jasmine.createSpy('toggleBookIndex'),
            navigateBookChild: jasmine.createSpy('navigateBookChild'),
            openChapter: jasmine.createSpy('openChapter'),
            openInterludeChapter: jasmine.createSpy('openInterludeChapter'),
            closeStructureEditor: jasmine.createSpy('closeStructureEditor'),
            isBookRunning: () => true,
            isChapterActive: (id: number) => url === `/book/7/chapter/${id}`,
            isInterludeChapterActive: () => false,
            getChapterOrderLabel: (item: { Orden: number }) => item.Orden,
            getChapterTitle: (item: { Nombre: string }) => item.Nombre,
            getChapterNavigationLabel: (item: { Orden: number; Nombre: string }) => `${item.Orden}. ${item.Nombre}`,
            handleCoverImageError: () => undefined
        };
    });

    it('offers the four destinations and marks Elementos for an element detail', () => {
        render('/book/7/character/21');
        const tabs = queryAll<HTMLButtonElement>('.book__tabs button');

        expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['Capítulos', 'Elementos', 'Notas', 'Resumen']);
        expect(tabs[1].getAttribute('aria-current')).toBe('page');
        expect(tabs[0].getAttribute('aria-current')).toBeNull();
        expect(queryAll('.book__bar button').length).toBe(4);
        expect(elementType.remember).toHaveBeenCalledWith('characters');
    });

    it('keeps the index for Capítulos only', () => {
        render('/book/7/statistics');
        expect(query('#web-book-index')).toBeNull();

        render('/book/7/chapter/3');
        expect(query('.book__title small').textContent).toBe('Ada, Bea');
        const chapters = queryAll<HTMLButtonElement>('.index__chapter');
        expect(chapters.map(chapter => chapter.getAttribute('aria-label'))).toEqual(['2. La bruma, página 15', '1. El faro, página 1']);
        expect(chapters[1].classList).toContain('is-active');

        chapters[0].click();
        expect(controller['openChapter']).toHaveBeenCalledWith(4);
    });

    it('returns to the last element type from Elementos', () => {
        render('/book/7/statistics');
        queryAll<HTMLButtonElement>('.book__tabs button')[1].click();

        expect(controller['navigateBookChild']).toHaveBeenCalledWith('quotes');
    });

    it('opens the latest chapter from Capítulos when none was open', () => {
        render('/book/7/notes');
        queryAll<HTMLButtonElement>('.book__tabs button')[0].click();

        expect(controller['openChapter']).toHaveBeenCalledWith(4);
    });

    it('lists the six element types with their counts on desktop', () => {
        render('/book/7/quotes');
        const types = queryAll<HTMLButtonElement>('.types button');

        expect(types.length).toBe(6);
        expect(types[0].textContent?.trim()).toBe('Personajes2');
        expect(types[5].getAttribute('aria-current')).toBe('page');
        types[0].click();
        expect(controller['navigateBookChild']).toHaveBeenCalledWith('characters');
    });

    it('moves between chapters from the chapter bar below desktop', () => {
        controller['isDesktopLayout'] = false;
        controller['bookIndexOpen'] = false;
        render('/book/7/chapter/3');

        expect(query('.subbar__position').textContent?.trim()).toBe('tocCapítulo 1 de 2');
        expect(query<HTMLButtonElement>('[aria-label="Capítulo anterior"]').disabled).toBeTrue();
        query<HTMLButtonElement>('[aria-label="Capítulo siguiente"]').click();
        expect(controller['openChapter']).toHaveBeenCalledWith(4);
    });

    it('closes the overlaid index with Escape below desktop', () => {
        controller['isDesktopLayout'] = false;
        render('/book/7/chapter/3');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(controller['bookIndexOpen']).toBeFalse();
    });

    it('keeps the side index open with Escape on desktop', () => {
        render('/book/7/chapter/3');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(controller['bookIndexOpen']).toBeTrue();
    });

    it('folds the desktop index into a rail and unfolds it from there', () => {
        render('/book/7/chapter/3');
        query<HTMLButtonElement>('[aria-label="Plegar el índice"]').click();
        fixture.detectChanges();

        expect(query('#web-book-index')).toBeNull();
        query<HTMLButtonElement>('.index-rail button').click();
        expect(controller['bookIndexOpen']).toBeTrue();
    });
});
