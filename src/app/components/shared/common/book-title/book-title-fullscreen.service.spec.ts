import { TestBed } from '@angular/core/testing';
import { BookTitleFullscreenService } from './book-title-fullscreen.service';

describe('BookTitleFullscreenService', () => {
    let service: BookTitleFullscreenService;

    beforeEach(() => {
        service = TestBed.inject(BookTitleFullscreenService);
    });

    afterEach(() => service.close());

    function pane(): HTMLElement | null {
        return document.querySelector('.book-title-fullscreen-pane');
    }

    it('«Ver en grande» abre la cabecera en un marco aislado a pantalla completa y se cierra con su botón', () => {
        let closed = false;
        service.open({ title: 'Brumas', html: '<h1>Brumas</h1>', styles: null }).subscribe({ complete: () => closed = true });
        TestBed.tick();

        const frame = pane()!.querySelector('iframe')!;
        expect(frame.getAttribute('sandbox')).toBe('');
        expect(frame.srcdoc).toContain('<h1>Brumas</h1>');
        (pane()!.querySelector('button[aria-label="Cerrar"]') as HTMLButtonElement).click();

        expect(pane()).toBeNull();
        expect(closed).toBeTrue();
        expect(service.isOpen).toBeFalse();
    });

    it('la escena se cierra tocando en cualquier sitio, y Escape también cierra', () => {
        service.open({ title: 'Brumas', html: '<h1>Brumas</h1>', styles: null, scene: true });
        TestBed.tick();
        const enter = pane()!.querySelector('.fullscreen__enter') as HTMLButtonElement;
        expect(enter.textContent?.trim()).toBe('Toca para entrar');
        enter.click();
        expect(pane()).toBeNull();

        service.open({ title: 'Brumas', html: '<h1>Brumas</h1>', styles: null });
        TestBed.tick();
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(pane()).toBeNull();
    });
});
