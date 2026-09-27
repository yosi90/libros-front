// Los RTF vienen del escritorio (fondo oscuro) y guardan colores de texto
// explícitos, casi siempre claros. Sobre un tema claro esos tramos desaparecen, y
// un negro explícito desaparece sobre un tema oscuro. No se reescribe el color
// guardado: se marca el tono con `data-rtf-ink` y cada tema decide si lo sustituye
// por su tinta al pintarlo. Un tramo con resaltado conserva su pareja de colores.

export type RtfInkTone = 'light' | 'dark';

const LIGHT_LUMINANCE = 0.6;
const DARK_LUMINANCE = 0.06;

/** Tono de un color de texto que deja de leerse en algún tema, o null si se lee en ambos. */
export function rtfInkTone(color: string | null | undefined): RtfInkTone | null {
    const rgb = parseColor(color);
    if (!rgb) return null;
    const luminance = relativeLuminance(rgb);
    if (luminance >= LIGHT_LUMINANCE) return 'light';
    if (luminance <= DARK_LUMINANCE) return 'dark';
    return null;
}

/** Marca (o desmarca) el tono de cada elemento con color en línea dentro del editor. */
export function markRtfInkTones(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[style*="color"], font[color]').forEach(element => {
        const color = element.style.color || element.getAttribute('color');
        const tone = hasHighlight(element, root) ? null : rtfInkTone(color);
        if (tone) {
            if (element.getAttribute('data-rtf-ink') !== tone) element.setAttribute('data-rtf-ink', tone);
        } else if (element.hasAttribute('data-rtf-ink')) {
            element.removeAttribute('data-rtf-ink');
        }
    });
}

function hasHighlight(element: HTMLElement, root: HTMLElement): boolean {
    for (let current: HTMLElement | null = element; current && current !== root; current = current.parentElement)
        if (current.style.backgroundColor) return true;
    return false;
}

function parseColor(value: string | null | undefined): [number, number, number] | null {
    const color = `${value ?? ''}`.trim().toLowerCase();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(color);
    if (hex) {
        const digits = hex[1].length === 3 ? hex[1].split('').map(digit => digit + digit).join('') : hex[1];
        return [0, 2, 4].map(offset => parseInt(digits.slice(offset, offset + 2), 16)) as [number, number, number];
    }
    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
    return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

function relativeLuminance([red, green, blue]: [number, number, number]): number {
    const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}
