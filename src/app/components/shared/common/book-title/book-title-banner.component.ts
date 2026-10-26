import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * La CSP del documento de la cabecera: solo estilos en línea y los de Google Fonts y los tres CDN que deja el servidor,
 * sus fuentes e imágenes `data:`. Ni scripts, ni conexiones, ni imágenes de fuera. Se suma a la de la página, que el
 * `srcdoc` hereda (`firebase.json`).
 */
export const BOOK_TITLE_BANNER_CSP = "default-src 'none'; "
    + "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; "
    + 'font-src data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; '
    + 'img-src data:';

/** El documento completo de la cabecera. Un `</style>` en los estilos no puede cerrar el bloque antes de tiempo. */
export function bookTitleBannerDocument(html: string, styles: string | null | undefined): string {
    const css = (styles ?? '').replace(/<\/style/gi, '<\\/style');
    return '<!doctype html><html><head><meta charset="utf-8">'
        + `<meta http-equiv="Content-Security-Policy" content="${BOOK_TITLE_BANNER_CSP}">`
        // La base, como en la APK: la cabecera es fluida y llena el marco (las de la app de escritorio no lo decían).
        + '<style>html,body{height:100%;margin:0;overflow:hidden}</style>'
        + `<style>${css}</style></head><body>${html}</body></html>`;
}

/**
 * El título divertido como lo pintaba la app de escritorio: si la IA trajo una cabecera animada (`Html` y `Estilos`),
 * en un `<iframe sandbox="">`; si no, la frase como texto, con la letra de quien lo aloja. Lo comparten las tres
 * presentaciones. Dónde va y cómo de grande lo decide quien lo aloja: el alto con `height` (o
 * `--book-title-banner-height`; 120 px si no dice nada), `layout` ancho (todo el ancho) o compacto (hasta
 * `--book-title-banner-compact-width`), y las esquinas con `--book-title-banner-radius`.
 */
@Component({
    selector: 'app-book-title-banner',
    standalone: true,
    template: `
        @if (document) {
            <iframe class="banner" sandbox="" loading="lazy" referrerpolicy="no-referrer" tabindex="-1" aria-hidden="true"
                [class.banner--compact]="layout === 'compact'" [style.height]="frameHeight" [title]="title" [srcdoc]="document"></iframe>
            <p class="banner__text">{{ title }}</p>
        } @else {
            <p class="text">{{ title }}</p>
        }
    `,
    styles: `
        :host
            position: relative
            display: block
            min-width: 0

        .banner
            display: block
            width: 100%
            height: var(--book-title-banner-height, 120px)
            border: 0
            border-radius: var(--book-title-banner-radius, 8px)
            background: transparent

        .banner--compact
            max-width: var(--book-title-banner-compact-width, 480px)

        .text
            margin: 0
            font: inherit
            color: inherit

        // La frase para los lectores de pantalla: la cabecera es decorativa.
        .banner__text
            position: absolute
            width: 1px
            height: 1px
            margin: -1px
            overflow: hidden
            clip-path: inset(50%)
            white-space: nowrap
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookTitleBannerComponent implements OnChanges {
    private readonly sanitizer = inject(DomSanitizer);

    /** La frase: el texto sin cabecera, el `title` del marco y lo que oyen los lectores de pantalla. */
    @Input({ required: true }) title = '';
    @Input() html: string | null = null;
    @Input() styles: string | null = null;
    /** Alto del marco: en px si es un número, o cualquier medida CSS («12rem»); null deja el de la presentación. */
    @Input() height: number | string | null = null;
    /** `wide`, todo el ancho disponible; `compact`, limitado en ancho. */
    @Input() layout: 'wide' | 'compact' = 'wide';

    document: SafeHtml | null = null;

    get frameHeight(): string | null {
        return typeof this.height === 'number' ? `${this.height}px` : this.height || null;
    }

    ngOnChanges(): void {
        // Solo para el `srcdoc` de este marco, y es seguro: `sandbox=""` sin permisos (sin scripts, sin el origen de la
        // página, sin formularios, ventanas ni navegación), la CSP propia del documento (sin scripts ni conexiones) y el
        // HTML y el CSS ya saneados en el servidor. Nada de esto entra en el DOM de la página.
        this.document = this.html
            ? this.sanitizer.bypassSecurityTrustHtml(bookTitleBannerDocument(this.html, this.styles))
            : null;
    }
}
