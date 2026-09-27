import { htmlToRtf, rtfToHtml } from './rtf-text';
import { markRtfInkTones, rtfInkTone } from './rtf-ink';

describe('rtf-ink', () => {
    it('clasifica los colores que dejan de leerse en un tema', () => {
        expect(rtfInkTone('#F6E6C9')).toBe('light');
        expect(rtfInkTone('rgb(255, 255, 255)')).toBe('light');
        expect(rtfInkTone('#000000')).toBe('dark');
        expect(rtfInkTone('#B85C5C')).toBeNull();
        expect(rtfInkTone('')).toBeNull();
    });

    it('marca el tono al convertir sin alterar el color guardado', () => {
        const rtf = String.raw`{\rtf1\ansi{\colortbl ;\red246\green230\blue201;}\cf1 Texto claro\par}`;
        const html = rtfToHtml(rtf);
        expect(html).toContain('data-rtf-ink="light"');
        expect(htmlToRtf(html)).toContain(String.raw`\red246\green230\blue201`);
    });

    it('respeta la pareja de colores de un tramo resaltado', () => {
        const root = document.createElement('div');
        root.innerHTML = '<span style="background-color:#14110D"><span style="color:#F6E6C9">Resaltado</span></span><span style="color:#FFFFFF">Suelto</span>';
        markRtfInkTones(root);
        const [highlighted, loose] = Array.from(root.querySelectorAll<HTMLElement>('[style*="color:#"], [style*="color: "]')).filter(element => element.textContent && !element.children.length);
        expect(highlighted.hasAttribute('data-rtf-ink')).toBeFalse();
        expect(loose.getAttribute('data-rtf-ink')).toBe('light');
    });
});
