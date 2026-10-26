import { TestBed } from '@angular/core/testing';
import { WebBookTitleComponent } from './web-book-title.component';
import type { BookTitleState } from '../../../shared/common/book-title/book-title.state';

describe('WebBookTitleComponent', () => {
    function render(state: Partial<BookTitleState>, mode: 'summary' | 'card' = 'card'): HTMLElement {
        const fixture = TestBed.createComponent(WebBookTitleComponent);
        fixture.componentInstance.mode = mode;
        fixture.componentInstance.state = {
            available: true, title: null, html: null, styles: null, emptyText: 'Aún no tiene título divertido',
            managementText: 'Tus claves de IA y su tope se gestionan en tu cuenta de Yosiftware',
            managementUrl: 'https://qa-social.yosiftware.es/?vista=claves-ia', maxLength: 200,
            editing: false, draft: '', saving: false, editError: '', showCounter: false,
            generatorOpen: false, checkingAi: false, aiProblem: '', models: [], model: null, generating: false,
            generateError: '', generateErrorNeedsManagement: false, limit: 0, limitReached: false, canGenerate: false,
            remainingText: '', limitReachedText: '',
            toggleGenerator: jasmine.createSpy('toggleGenerator'), startEditing: jasmine.createSpy('startEditing'),
            ...state
        } as unknown as BookTitleState;
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('sin título lo dice y ofrece las dos acciones', () => {
        const element = render({});
        expect(element.textContent).toContain('Aún no tiene título divertido');
        const buttons = [...element.querySelectorAll('button')].map(button => button.textContent?.trim());
        expect(buttons).toEqual(['editEditar', 'auto_awesomeGenerar con IA']);
    });

    it('sin clave lista enseña el motivo y el enlace a la gestión con el símbolo, sin el botón de generar', () => {
        const element = render({ generatorOpen: true, aiProblem: 'Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.' });
        const link = element.querySelector('a.fun-title__link') as HTMLAnchorElement;
        expect(element.textContent).toContain('Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.');
        expect(link.href).toBe('https://qa-social.yosiftware.es/?vista=claves-ia');
        expect(link.querySelector('app-yosiftware-mark')).not.toBeNull();
        expect(element.querySelector('select')).toBeNull();
    });

    it('ofrece los modelos en un desplegable y, con el límite agotado, deshabilita «Generar»', () => {
        const element = render({
            generatorOpen: true, models: [{ key: 'anthropic:claude-haiku-5-5', id: 'claude-haiku-5-5', proveedor: 'anthropic', label: 'Claude Haiku 5.5 · Anthropic' }],
            model: 'anthropic:claude-haiku-5-5', limit: 10, limitReached: true, canGenerate: false, limitReachedText: 'Ya has generado los 10 títulos de hoy. Mañana podrás generar más.'
        });
        expect(element.querySelector('input[name="funTitleModel"]')).toBeNull();
        expect(element.querySelector('select option')?.textContent?.trim()).toBe('Claude Haiku 5.5 · Anthropic');
        const generate = [...element.querySelectorAll('button')].find(button => button.textContent?.includes('Generar') && !button.textContent.includes('con IA'))!;
        expect(generate.disabled).toBeTrue();
        expect(element.textContent).toContain('Ya has generado los 10 títulos de hoy.');
    });

    it('en el resumen, la cabecera grande con «Generar otro» y «Editar la frase» encima', () => {
        const element = render({ title: 'Brumas', html: '<h1>Brumas</h1>' }, 'summary');
        expect((element.querySelector('.fun-title__hero iframe') as HTMLIFrameElement).style.height).toBe('240px');
        const overlay = [...element.querySelectorAll('.fun-title__overlay button')].map(button => button.textContent?.trim());
        expect(overlay).toEqual(['auto_awesomeGenerar otro', 'editEditar la frase']);
        expect(element.querySelector('.fun-title__actions')).toBeNull();
    });

    it('en la ficha, una franja baja y «Ver en grande»', () => {
        const openLarge = jasmine.createSpy('openLarge');
        const element = render({ title: 'Brumas', html: '<h1>Brumas</h1>', openLarge });
        expect((element.querySelector('.fun-title__strip iframe') as HTMLIFrameElement).style.height).toBe('76px');
        (element.querySelector('.fun-title__large') as HTMLButtonElement).click();
        expect(openLarge).toHaveBeenCalled();
        expect(element.querySelector('.fun-title__actions')).not.toBeNull();
    });

    it('con generaciones disponibles dice cuántas quedan', () => {
        const element = render({ generatorOpen: true, models: [{ key: 'openai:gpt-5.4-mini', id: 'gpt-5.4-mini', proveedor: 'openai', label: 'GPT-5.4 mini · OpenAI' }], model: 'openai:gpt-5.4-mini', limit: 10, canGenerate: true, remainingText: 'Te quedan 7 hoy' });
        expect(element.textContent).toContain('Te quedan 7 hoy');
    });
});
