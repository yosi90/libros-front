import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { MobileBookShellComponent } from './mobile-book-shell.component';
import type { BookComponent } from '../../../shared/book-pages/book/book.component';

describe('MobileBookShellComponent', () => {
    let fixture: ComponentFixture<MobileBookShellComponent>;
    let controller: Record<string, unknown>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MobileBookShellComponent],
            providers: [provideHttpClient(), provideRouter([])]
        }).compileComponents();

        controller = {
            book: { Id: 7, Nombre: 'Libro de prueba', Portada: '', Partes: [] },
            isNativeReader: true,
            bookIndexOpen: false,
            bookActionsOpen: false,
            structureEditorKind: null,
            displayList: [],
            entityToolbarActions: [
                { label: 'Personajes', icon: 'theater_comedy', listRoute: 'characters', createRoute: 'character' },
                { label: 'Localizaciones', icon: 'location_on', listRoute: 'locations', createRoute: 'location' },
                { label: 'Organizaciones', icon: 'groups', listRoute: 'organizations', createRoute: 'organization' },
                { label: 'Eventos', icon: 'event', listRoute: 'events', createRoute: 'event' },
                { label: 'Conceptos', icon: 'auto_awesome', listRoute: 'concepts', createRoute: 'concept' },
                { label: 'Citas', icon: 'format_quote', listRoute: 'quotes', createRoute: 'quote' }
            ],
            backToLibrary: jasmine.createSpy('backToLibrary'),
            toggleBookIndex: jasmine.createSpy('toggleBookIndex'),
            toggleBookActions: jasmine.createSpy('toggleBookActions'),
            navigateBookChild: jasmine.createSpy('navigateBookChild'),
            openBookWiki: jasmine.createSpy('openBookWiki'),
            hasBookWikiLink: () => false,
            isBookChildActive: (route: string) => route === 'statistics',
            isBookRunning: () => true,
            isSavingRunningStatus: false
        };

        fixture = TestBed.createComponent(MobileBookShellComponent);
        fixture.componentInstance.controller = controller as unknown as BookComponent;
        fixture.detectChanges();
    });

    it('places statistics, wiki and search in the top bar', () => {
        const buttons = [...fixture.nativeElement.querySelectorAll('.m-book-bar__tools button')] as HTMLButtonElement[];

        expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
            'Estadísticas', 'Wiki no disponible', 'Buscar dentro del libro'
        ]);
        expect(buttons[0].classList).toContain('is-active');
        expect(buttons[1].disabled).toBeTrue();
        expect(fixture.nativeElement.querySelector('.m-book-bar__identity small')).toBeNull();
    });

    it('keeps only index and elements in compact and exposes every list in medium', () => {
        const compact = fixture.nativeElement.querySelector('.m-book-navigation--compact') as HTMLElement;
        const medium = fixture.nativeElement.querySelector('.m-book-navigation--medium') as HTMLElement;

        expect([...compact.querySelectorAll('button')].map(button => button.querySelector('span')?.textContent?.trim())).toEqual([
            'Índice', 'Elementos'
        ]);
        expect([...medium.querySelectorAll('button')].map(button => button.querySelector('span')?.textContent?.trim())).toEqual([
            'Índice', 'Personajes', 'Localizaciones', 'Organizaciones', 'Eventos', 'Conceptos', 'Citas'
        ]);
    });

    it('renders the index as a native-back overlay with all structure actions', () => {
        controller['bookIndexOpen'] = true;
        fixture.detectChanges();

        const index = fixture.nativeElement.querySelector('.m-book-index') as HTMLElement;
        expect(index.hasAttribute('data-native-back-overlay')).toBeTrue();
        expect(index.querySelector('[data-native-back-action]')).not.toBeNull();
        expect(index.querySelector('mat-icon')?.textContent).not.toBe('close');
        expect(index.textContent).toContain('Capítulo');
        expect(index.textContent).toContain('Parte');
        expect(index.textContent).toContain('Interludio');
        expect(index.querySelector('h1')).toBeNull();
    });

    it('closes the index when its backdrop is pressed at any mobile width', () => {
        controller['bookIndexOpen'] = true;
        fixture.detectChanges();

        (fixture.nativeElement.querySelector('.m-book-index-backdrop') as HTMLButtonElement).click();

        expect(controller['bookIndexOpen']).toBeFalse();
    });

    it('closes the index with a sufficient left drag and cancels a short one', fakeAsync(() => {
        const component = fixture.componentInstance;
        const target = jasmine.createSpyObj<HTMLElement>('index', ['setPointerCapture', 'releasePointerCapture']);
        const pointer = (x: number, y: number) => ({ pointerId: 4, button: 0, clientX: x, clientY: y, currentTarget: target } as unknown as PointerEvent);
        controller['bookIndexOpen'] = true;

        component.startIndexDrag(pointer(180, 80));
        component.moveIndexDrag(pointer(140, 82));
        component.finishIndexDrag(pointer(140, 82));
        expect(controller['bookIndexOpen']).toBeTrue();
        expect(component.indexDragOffset).toBe(0);

        component.startIndexDrag(pointer(180, 80));
        component.moveIndexDrag(pointer(90, 82));
        component.finishIndexDrag(pointer(90, 82));
        tick(180);

        expect(controller['bookIndexOpen']).toBeFalse();
    }));

    it('closes the elements sheet with a sufficient downward drag and cancels a short one', fakeAsync(() => {
        const component = fixture.componentInstance;
        const target = jasmine.createSpyObj<HTMLElement>('handle', ['setPointerCapture', 'releasePointerCapture']);
        const pointer = (y: number) => ({ pointerId: 8, button: 0, clientY: y, currentTarget: target } as unknown as PointerEvent);
        controller['bookActionsOpen'] = true;

        component.startActionsDrag(pointer(20));
        component.moveActionsDrag(pointer(70));
        component.finishActionsDrag(pointer(70));
        expect(controller['bookActionsOpen']).toBeTrue();
        expect(component.actionsDragOffset).toBe(0);

        component.startActionsDrag(pointer(20));
        component.moveActionsDrag(pointer(110));
        component.finishActionsDrag(pointer(110));
        tick(200);

        expect(controller['bookActionsOpen']).toBeFalse();
    }));
});
