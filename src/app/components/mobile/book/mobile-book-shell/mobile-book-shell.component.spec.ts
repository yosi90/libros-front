import { ComponentFixture, TestBed } from '@angular/core/testing';
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

    it('exposes the five stable book destinations and disables an unavailable wiki', () => {
        const navigation = fixture.nativeElement.querySelector('.m-book-navigation') as HTMLElement;
        const buttons = [...navigation.querySelectorAll('button')];

        expect(buttons.map(button => button.querySelector('span')?.textContent?.trim())).toEqual([
            'Índice', 'Estadísticas', 'Wiki', 'Buscar', 'Elementos'
        ]);
        expect(buttons[1].classList).toContain('is-active');
        expect(buttons[2].disabled).toBeTrue();
        expect(buttons[2].getAttribute('aria-label')).toBe('Wiki no disponible');
    });

    it('renders the index as a native-back overlay with all structure actions', () => {
        controller['bookIndexOpen'] = true;
        fixture.detectChanges();

        const index = fixture.nativeElement.querySelector('.m-book-index') as HTMLElement;
        expect(index.hasAttribute('data-native-back-overlay')).toBeTrue();
        expect(index.querySelector('[data-native-back-action]')).not.toBeNull();
        expect(index.textContent).toContain('Capítulo');
        expect(index.querySelector('button[aria-label="Nueva parte"]')).not.toBeNull();
        expect(index.querySelector('button[aria-label="Nuevo interludio"]')).not.toBeNull();
    });

    it('closes the index when its backdrop is pressed at any mobile width', () => {
        controller['bookIndexOpen'] = true;
        fixture.detectChanges();

        (fixture.nativeElement.querySelector('.m-book-index-backdrop') as HTMLButtonElement).click();

        expect(controller['bookIndexOpen']).toBeFalse();
    });
});
