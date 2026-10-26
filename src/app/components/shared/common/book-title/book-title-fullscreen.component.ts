import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BookTitleBannerComponent } from './book-title-banner.component';

/**
 * La cabecera del título a pantalla completa: «Ver en grande» desde la ficha (con su botón de cerrar) o la escena al
 * abrir un libro («Toca para entrar»: toda la pantalla es el botón, porque los toques dentro del marco no salen de él).
 * Neutral entre presentaciones: lo que se ve es la cabecera de la persona. La abre `BookTitleFullscreenService`.
 */
@Component({
    selector: 'app-book-title-fullscreen',
    standalone: true,
    imports: [A11yModule, MatIconModule, BookTitleBannerComponent],
    template: `
        <div class="fullscreen" role="dialog" aria-modal="true" [attr.aria-label]="title" cdkTrapFocus cdkTrapFocusAutoCapture>
            <app-book-title-banner class="fullscreen__banner" [title]="title" [html]="html" [styles]="styles" height="100%"></app-book-title-banner>
            @if (scene) {
                <button class="fullscreen__enter" type="button" cdkFocusInitial (click)="closed.emit()"><span>Toca para entrar</span></button>
            } @else {
                <button class="fullscreen__close" type="button" aria-label="Cerrar" cdkFocusInitial (click)="closed.emit()"><mat-icon aria-hidden="true">close</mat-icon></button>
            }
        </div>
    `,
    styles: `
        :host
            display: block
            width: 100%
            height: 100%

        .fullscreen
            position: relative
            width: 100%
            height: 100%
            background: #0d0f0e
            --book-title-banner-radius: 0

        .fullscreen__banner
            height: 100%

        .fullscreen__close
            position: absolute
            top: max(12px, env(safe-area-inset-top))
            right: max(12px, env(safe-area-inset-right))
            display: grid
            place-items: center
            width: 48px
            height: 48px
            padding: 0
            color: #fff
            background: rgba(0, 0, 0, .55)
            border: 1px solid rgba(255, 255, 255, .35)
            border-radius: 50%
            cursor: pointer

        .fullscreen__enter
            position: absolute
            inset: 0
            display: flex
            align-items: flex-end
            justify-content: center
            padding: 0 16px max(32px, env(safe-area-inset-bottom))
            background: transparent
            border: 0
            cursor: pointer

            span
                padding: 10px 18px
                color: #fff
                font: 600 15px/1.2 Inter, ui-sans-serif, system-ui, sans-serif
                background: rgba(0, 0, 0, .55)
                border-radius: 999px

        .fullscreen__close:focus-visible,
        .fullscreen__enter:focus-visible span
            outline: 3px solid #fff
            outline-offset: 2px
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookTitleFullscreenComponent {
    @Input() title = '';
    @Input() html: string | null = null;
    @Input() styles: string | null = null;
    /** La escena al abrir un libro: «Toca para entrar» en lugar de cerrar. */
    @Input() scene = false;
    @Output() readonly closed = new EventEmitter<void>();
}
