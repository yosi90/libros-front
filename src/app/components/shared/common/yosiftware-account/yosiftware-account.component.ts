import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';

/**
 * El botón de la cuenta de Yosiftware (`<yosi-acceso>`, ecosistema-kit/ACCESO.md): «Entrar» sin sesión y, con ella,
 * el avatar que abre el panel de cuentas (cambiar, añadir, salir y «Gestionar tu cuenta»). Lo registra el SDK de la
 * plataforma al cargarse; hasta entonces no ocupa sitio. Su aspecto sale de las variables `--yosi-*` de cada
 * presentación (`_yosiftware.sass` de `assets/css/web`, `wood` y `mobile`).
 */
@Component({
    selector: 'app-yosiftware-account',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `<yosi-acceso [attr.vista]="vista"></yosi-acceso>`,
    styles: `
        :host
            display: inline-flex
            align-items: center
            min-width: 0
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class YosiftwareAccountComponent {
    /** `registro` abre directamente el formulario de crear cuenta. */
    @Input() vista: 'registro' | null = null;
}
