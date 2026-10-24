import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { Router } from '@angular/router';

/** Lo que trae `yosi-notificacion-abrir` (NOTIFICACIONES.md, «La campana en tu web»). */
interface NotificationOpenDetail { enlace?: string }

/**
 * La campana de la plataforma (`<yosi-notificaciones>`, ecosistema-kit/NOTIFICACIONES.md): el contador, el centro y
 * los avisos emergentes de todas las webs. Libros no tiene campana, centro ni avisos propios. Los enlaces de la propia
 * web se abren sin recargar; los demás, como decida el SDK (en otra pestaña). Los avisos emergentes se bajan con
 * `--yosi-avisos-arriba` donde la cabecera es fija (los `_yosiftware.sass` de cada presentación).
 */
@Component({
    selector: 'app-yosiftware-notifications',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `<yosi-notificaciones [attr.sin-avisos]="withoutToasts ? '' : null" (yosi-notificacion-abrir)="open($event)"></yosi-notificaciones>`,
    styles: `
        :host
            display: inline-flex
            align-items: center
            min-width: 0
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class YosiftwareNotificationsComponent {
    /** Con varias campanas en la página (la de la barra compacta y la del menú), solo una pone los avisos. */
    @Input() withoutToasts = false;

    constructor(private router: Router) { }

    open(event: Event): void {
        const link = (event as CustomEvent<NotificationOpenDetail>).detail?.enlace;
        const target = internalTarget(link, window.location.origin);
        if (!target) return;
        event.preventDefault();
        void this.router.navigateByUrl(target);
    }
}

/** La ruta dentro de Libros de un enlace de notificación, o `null` si es de otro sitio. */
export function internalTarget(link: string | null | undefined, origin: string): string | null {
    if (!link) return null;
    try {
        const url = new URL(link, origin);
        return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : null;
    } catch {
        return null;
    }
}
