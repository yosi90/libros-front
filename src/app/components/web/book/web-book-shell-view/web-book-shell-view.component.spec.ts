import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';

import { WebBookShellViewComponent } from './web-book-shell-view.component';
import type { BookComponent } from '../../../shared/book-pages/book/book.component';

describe('WebBookShellViewComponent', () => {
    let fixture: ComponentFixture<WebBookShellViewComponent>;
    let controller: Record<string, unknown>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WebBookShellViewComponent],
            providers: [provideHttpClient(), provideRouter([])]
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOnProperty(router, 'url', 'get').and.returnValue('/book/7/character/21');

        const chapter = { Id: 3, Nombre: 'El faro', Orden: 1 };
        controller = {
            book: { Id: 7, Nombre: 'Libro de prueba', Portada: '', Autores: [{ Id: 1, Nombre: 'Ada' }, { Id: 2, Nombre: 'Bea' }], Partes: [] },
            bookIndexOpen: true,
            isDesktopLayout: true,
            structureEditorKind: null,
            isSavingRunningStatus: false,
            displayList: [{ type: 'chapter', data: chapter }],
            entityToolbarActions: [
                { label: 'Personajes', icon: 'co_present', listRoute: 'characters', createRoute: 'character' },
                { label: 'Citas', icon: 'format_quote', listRoute: 'quotes', createRoute: 'quote' }
            ],
            backToLibrary: jasmine.createSpy('backToLibrary'),
            toggleBookIndex: jasmine.createSpy('toggleBookIndex'),
            navigateBookChild: jasmine.createSpy('navigateBookChild'),
            openBookWiki: jasmine.createSpy('openBookWiki'),
            openChapter: jasmine.createSpy('openChapter'),
            closeStructureEditor: jasmine.createSpy('closeStructureEditor'),
            hasBookWikiLink: () => false,
            isBookRunning: () => true,
            isChapterActive: (id: number) => id === 3,
            isInterludeChapterActive: () => false,
            getChapterOrderLabel: (item: { Orden: number }) => item.Orden,
            getChapterTitle: (item: { Nombre: string }) => item.Nombre,
            handleCoverImageError: () => undefined
        };

        fixture = TestBed.createComponent(WebBookShellViewComponent);
        fixture.componentInstance.controller = controller as unknown as BookComponent;
        fixture.detectChanges();
    });

    it('marks the entity tab for both its list and its detail routes', () => {
        const tabs = [...fixture.nativeElement.querySelectorAll('.book__tabs button')] as HTMLButtonElement[];

        expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['query_statsResumen', 'co_presentPersonajes', 'format_quoteCitas']);
        expect(tabs[1].classList).toContain('is-active');
        expect(tabs[1].getAttribute('aria-current')).toBe('page');
        expect(tabs[0].classList).not.toContain('is-active');
    });

    it('shows the authors and opens chapters from the index', () => {
        expect(fixture.nativeElement.querySelector('.book__title small').textContent).toBe('Ada, Bea');

        const chapter = fixture.nativeElement.querySelector('.index__chapter') as HTMLButtonElement;
        expect(chapter.classList).toContain('is-active');
        chapter.click();

        expect(controller['openChapter']).toHaveBeenCalledWith(3);
    });

    it('closes the overlaid index with Escape below desktop', () => {
        controller['isDesktopLayout'] = false;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(controller['bookIndexOpen']).toBeFalse();
    });

    it('keeps the side index open with Escape on desktop', () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(controller['bookIndexOpen']).toBeTrue();
    });
});
