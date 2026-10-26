import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { WebBookTitleComponent } from './web-book-title.component';
import type { BookTitleState } from '../../../shared/common/book-title/book-title.state';

describe('WebBookTitleComponent', () => {
    function render(state: Partial<BookTitleState>, mode: 'summary' | 'card' = 'card') {
        const fixture = TestBed.createComponent(WebBookTitleComponent);
        const fake = {
            available: true, title: null, html: null, styles: null, emptyText: 'Aún no tiene título divertido',
            managementText: 'Tus claves de IA y su tope se gestionan en tu cuenta de Yosiftware',
            managementUrl: 'https://qa-social.yosiftware.es/?vista=claves-ia', maxLength: 200,
            optionsOpen: false, editing: false, draft: '', saving: false, editError: '', showCounter: false,
            generatorOpen: false, checkingAi: false, aiProblem: '', models: [], model: null, generating: false,
            generateError: '', generateErrorNeedsManagement: false, limit: 0, limitReached: false, canGenerate: false,
            remainingText: '', limitReachedText: '',
            openOptions() { this.optionsOpen = true; }, closeOptions() { this.optionsOpen = false; },
            toggleGenerator: jasmine.createSpy('toggleGenerator'), startEditing: jasmine.createSpy('startEditing'),
            openLarge: jasmine.createSpy('openLarge'),
            ...state
        };
        fixture.componentInstance.state = fake as unknown as BookTitleState;
        fixture.componentInstance.mode = mode;
        fixture.detectChanges();
        const panel = () => TestBed.inject(OverlayContainer).getContainerElement().querySelector('.fun-title__panel') as HTMLElement | null;
        const open = () => {
            (fixture.nativeElement.querySelector('button[aria-label="Opciones de tu título"]') as HTMLButtonElement).click();
            fixture.detectChanges();
            return panel()!;
        };
        return { element: fixture.nativeElement as HTMLElement, fixture, fake, panel, open };
    }

    it('sin título lo dice y deja un único botón, el de opciones', () => {
        const { element } = render({});
        expect(element.textContent).toContain('Aún no tiene título divertido');
        const buttons = [...element.querySelectorAll('button')];
        expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Opciones de tu título']);
    });

    it('las opciones abren el panel con «Generar con IA» y «Editar la frase»; con cabecera, también «Ver en grande»', () => {
        let view = render({});
        let items = [...view.open().querySelectorAll('.fun-title__item')].map(item => item.textContent?.trim());
        expect(items).toEqual(['auto_awesomeGenerar con IA', 'editEditar la frase']);
        view.fixture.destroy();

        view = render({ title: 'Brumas', html: '<h1>Brumas</h1>' });
        items = [...view.open().querySelectorAll('.fun-title__item')].map(item => item.textContent?.trim());
        expect(items).toEqual(['auto_awesomeGenerar con IA', 'editEditar la frase', 'open_in_fullVer en grande']);
    });

    it('sin clave lista enseña en el panel el motivo y el enlace a la gestión con el símbolo', () => {
        const { open } = render({ optionsOpen: false, generatorOpen: true, aiProblem: 'Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.' });
        const panel = open();
        const link = panel.querySelector('a.fun-title__link') as HTMLAnchorElement;
        expect(panel.textContent).toContain('Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.');
        expect(link.href).toBe('https://qa-social.yosiftware.es/?vista=claves-ia');
        expect(link.querySelector('app-yosiftware-mark')).not.toBeNull();
        expect(panel.querySelector('select')).toBeNull();
    });

    it('ofrece los modelos en un desplegable y, con el límite agotado, deshabilita «Generar»', () => {
        const { open } = render({
            generatorOpen: true, models: [{ key: 'anthropic:claude-haiku-5-5', id: 'claude-haiku-5-5', proveedor: 'anthropic', label: 'Claude Haiku 5.5 · Anthropic' }],
            model: 'anthropic:claude-haiku-5-5', limit: 10, limitReached: true, canGenerate: false,
            limitReachedText: 'Ya has generado los 10 títulos de hoy. Mañana podrás generar más.'
        });
        const panel = open();
        expect(panel.querySelector('select option')?.textContent?.trim()).toBe('Claude Haiku 5.5 · Anthropic');
        const generate = [...panel.querySelectorAll('button')].find(button => button.textContent?.trim().endsWith('Generar'))!;
        expect(generate.disabled).toBeTrue();
        expect(panel.textContent).toContain('Ya has generado los 10 títulos de hoy.');
    });

    it('con generaciones disponibles dice cuántas quedan', () => {
        const { open } = render({ generatorOpen: true, models: [{ key: 'openai:gpt-5.4-mini', id: 'gpt-5.4-mini', proveedor: 'openai', label: 'GPT-5.4 mini · OpenAI' }], model: 'openai:gpt-5.4-mini', limit: 10, canGenerate: true, remainingText: 'Te quedan 7 hoy' });
        expect(open().textContent).toContain('Te quedan 7 hoy');
    });

    it('en el resumen, la cabecera grande con solo el botón de opciones encima', () => {
        const { element } = render({ title: 'Brumas', html: '<h1>Brumas</h1>' }, 'summary');
        expect((element.querySelector('.fun-title__hero iframe') as HTMLIFrameElement).style.height).toBe('240px');
        expect([...element.querySelectorAll('button')].map(button => button.getAttribute('aria-label'))).toEqual(['Opciones de tu título']);
    });

    it('en la ficha, una franja baja que se abre en grande al tocarla', () => {
        const { element, fake } = render({ title: 'Brumas', html: '<h1>Brumas</h1>' });
        expect((element.querySelector('.fun-title__strip iframe') as HTMLIFrameElement).style.height).toBe('76px');
        (element.querySelector('button[aria-label="Ver en grande"]') as HTMLButtonElement).click();
        expect(fake.openLarge).toHaveBeenCalled();
    });
});
