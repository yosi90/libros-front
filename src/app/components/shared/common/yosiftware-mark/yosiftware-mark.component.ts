import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * El símbolo del ecosistema Yosiftware (ecosistema-kit/MARCA.md), sin redibujar: `simbolo-trazo.svg` del kit como
 * máscara, para que tome el color del texto que acompaña. Va delante de todo enlace a la web social y donde Libros
 * dice que usa la cuenta de Yosiftware.
 */
@Component({
    selector: 'app-yosiftware-mark',
    standalone: true,
    template: '',
    host: { 'aria-hidden': 'true' },
    styles: `
        :host
            display: inline-block
            flex: none
            width: 1.15em
            height: 1.15em
            vertical-align: -.2em
            background: currentColor
            -webkit-mask: url('/assets/media/img/yosiftware/simbolo-trazo.svg') center / contain no-repeat
            mask: url('/assets/media/img/yosiftware/simbolo-trazo.svg') center / contain no-repeat
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class YosiftwareMarkComponent { }
