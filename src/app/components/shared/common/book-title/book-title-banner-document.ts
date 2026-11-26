/**
 * El documento aislado de la cabecera del título divertido: solo recursos propios. Las tipografías son las de la web
 * (`assets/fonts/fuentes.css`); nada de Google Fonts ni de CDN. La APK lo replica en `documentoDeLaCabecera`
 * (`android-nativa/.../ui/libro/TituloDelLibro.kt`): un cambio aquí va también allí.
 */

/** Dónde están las tipografías propias, con su hoja. */
export const BOOK_TITLE_BANNER_FONTS_PATH = 'assets/fonts/';

/**
 * La familia propia que sustituye a la que pedía una cabecera de fuera, según la genérica de su lista. Va justo antes
 * de la genérica: las que la cabecera nombra antes (si las tiene el sistema) siguen mandando.
 */
const OWN_FALLBACKS: Record<string, string> = {
    'serif': 'Playfair Display',
    'ui-serif': 'Playfair Display',
    'sans-serif': 'Montserrat',
    'ui-sans-serif': 'Montserrat',
    'system-ui': 'Montserrat',
    'ui-rounded': 'Montserrat',
    'fantasy': 'Cinzel Decorative',
    'cursive': 'MedievalSharp'
};
/** Sin genérica en la lista, la de los titulares. */
const DEFAULT_FALLBACK = 'Playfair Display';
const GENERIC = /(^|[,\s])(sans-serif|serif|ui-sans-serif|ui-serif|ui-rounded|system-ui|fantasy|cursive|monospace|ui-monospace|emoji|math|fangsong)(?=\s*(?:,|$))/i;
const DECLARATION = /(^|[;{\s])(font-family|font)(\s*:\s*)([^;{}]+)/gi;
const KEYWORD_VALUE = /^(?:inherit|initial|unset|revert|revert-layer)$|var\(/i;

/**
 * La CSP del documento: estilos en línea y la hoja y las tipografías propias (solo `assets/fonts/` de la web),
 * imágenes `data:`. Ni scripts, ni conexiones, ni nada de otros orígenes. Se suma a la de la página, que el `srcdoc`
 * hereda (`firebase.json`).
 */
export function bookTitleBannerCsp(fontsUrl: string): string {
    return `default-src 'none'; style-src 'unsafe-inline' ${fontsUrl}; font-src data: ${fontsUrl}; img-src data:`;
}

/** La familia propia de respaldo de una declaración `font-family` o `font`, o la misma si no hace falta. */
function withOwnFallback(property: string, value: string): string {
    const important = /\s*!important\s*$/i.exec(value);
    const list = important ? value.slice(0, important.index) : value;
    if (KEYWORD_VALUE.test(list.trim()))
        return value;
    const generic = GENERIC.exec(list);
    const own = generic ? OWN_FALLBACKS[generic[2].toLowerCase()] : (property === 'font-family' ? DEFAULT_FALLBACK : null);
    if (!own || list.toLowerCase().includes(own.toLowerCase()))
        return value;
    const withOwn = generic
        ? `${list.slice(0, generic.index + generic[1].length)}'${own}', ${list.slice(generic.index + generic[1].length)}`
        : `${list.trimEnd()}, '${own}'`;
    return withOwn + (important?.[0] ?? '');
}

/**
 * El CSS de la cabecera con solo recursos propios: sin `@import` (las de Google Fonts y los CDN de antes), sin
 * `url()` que no sea `data:` y con una familia propia de respaldo en cada lista de fuentes, para que las cabeceras que
 * pedían una fuente de fuera se sigan viendo bien. La CSP del marco lo garantiza igualmente; esto evita sus avisos.
 */
export function ownBannerStyles(styles: string | null | undefined): string {
    // Los `@font-face` se apartan mientras tanto: su `font-family` es un nombre, no una lista.
    const faces: string[] = [];
    return (styles ?? '')
        .replace(/\/\*[\s\S]*?(?:\*\/|$)/g, '')
        .replace(/@import\b[^;]*(?:;|$)/gi, '')
        .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, _quote, url: string) => /^data:/i.test(url.trim()) ? match : 'none')
        .replace(/@font-face\s*\{[^}]*\}/gi, face => `\u0000${faces.push(face) - 1}\u0000`)
        .replace(DECLARATION, (_match, before: string, property: string, colon: string, value: string) =>
            `${before}${property}${colon}${withOwnFallback(property.toLowerCase(), value)}`)
        .replace(/\u0000(\d+)\u0000/g, (_match, index: string) => faces[Number(index)] ?? '');
}

/**
 * El documento completo de la cabecera, con la hoja de las tipografías propias de `fontsUrl` (la carpeta
 * `assets/fonts/` de la web, absoluta). Un `</style>` en los estilos no puede cerrar el bloque antes de tiempo.
 */
export function bookTitleBannerDocument(html: string, styles: string | null | undefined, fontsUrl: string): string {
    const css = ownBannerStyles(styles).replace(/<\/style/gi, '<\\/style');
    return '<!doctype html><html><head><meta charset="utf-8">'
        + `<meta http-equiv="Content-Security-Policy" content="${bookTitleBannerCsp(fontsUrl)}">`
        + `<link rel="stylesheet" href="${fontsUrl}fuentes.css">`
        // La base, como en la APK: la cabecera es fluida y llena el marco (las de la app de escritorio no lo decían).
        + '<style>html,body{height:100%;margin:0;overflow:hidden}</style>'
        + `<style>${css}</style></head><body>${html}</body></html>`;
}

/** La carpeta de las tipografías propias, absoluta, a partir de la dirección base de la página. */
export function bookTitleBannerFontsUrl(baseUri: string): string {
    return new URL(BOOK_TITLE_BANNER_FONTS_PATH, baseUri).href;
}
