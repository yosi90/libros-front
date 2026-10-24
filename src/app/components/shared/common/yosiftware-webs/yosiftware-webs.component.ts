import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

/**
 * El botón de las webs del ecosistema (`<yosi-webs>`, ecosistema-kit/ACCESO.md, «Las webs del ecosistema»): la
 * cuadrícula con la web social primero, las webs y sus apps. Obligatorio en la cabecera, junto a la cuenta. Lo pinta el
 * SDK con las variables `--yosi-*` de cada presentación; hasta que se carga no ocupa sitio.
 */
@Component({
    selector: 'app-yosiftware-webs',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `<yosi-webs></yosi-webs>`,
    styles: `
        :host
            display: inline-flex
            align-items: center
            min-width: 0
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class YosiftwareWebsComponent { }
