import { htmlToRtf, plainTextToRtf, rtfToHtml, rtfToPlainText } from './rtf-text';

describe('rtf-text', () => {
    it('keeps legacy plain RTF readable as plain text', () => {
        const rtf = plainTextToRtf('Linea uno\nLinea dos');

        expect(rtfToPlainText(rtf)).toBe('Linea uno\nLinea dos');
    });

    it('converts basic RTF inline formatting to editor HTML', () => {
        const rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Microsoft Sans Serif;}}\\viewkind4\\uc1\\pard\\f0\\fs24 Normal \\b negrita\\b0  \\i cursiva\\i0  \\ul subrayado\\ulnone  \\strike tachado\\strike0\\par}';

        const html = rtfToHtml(rtf);

        expect(html).toContain('<p');
        expect(html).toContain('<strong>');
        expect(html).toContain('<em>');
        expect(html).toContain('<u>');
        expect(html).toContain('<s>');
        expect(rtfToPlainText(rtf)).toBe('Normal negrita cursiva subrayado tachado');
    });

    it('converts editor HTML to persisted RTF formatting controls', () => {
        const rtf = htmlToRtf('Normal <strong>negrita</strong> <em>cursiva</em> <u>subrayado</u> <s>tachado</s>');

        expect(rtf).toContain('\\b negrita\\b0 ');
        expect(rtf).toContain('\\i cursiva\\i0 ');
        expect(rtf).toContain('\\ul subrayado\\ulnone ');
        expect(rtf).toContain('\\strike tachado\\strike0 ');
        expect(rtf).not.toContain('<strong>');
    });

    it('preserves line breaks through html and RTF conversion', () => {
        const rtf = htmlToRtf('Linea uno<br>Linea dos');

        expect(rtf).toContain('Linea uno\\line Linea dos');
        expect(rtfToPlainText(rtf)).toBe('Linea uno\nLinea dos');
    });

    it('trims empty editor blocks around the persisted text', () => {
        const rtf = htmlToRtf('<div><br></div><div><br></div><div>Linea uno</div>');

        expect(rtfToPlainText(rtf)).toBe('Linea uno');
    });

    it('does not persist visual narrative link wrappers', () => {
        const rtf = htmlToRtf('<span class="rtf-narrative-link" contenteditable="false" spellcheck="false" data-target-url="/book/1/characters?selected=2">Velo</span>');

        expect(rtfToPlainText(rtf)).toBe('Velo');
        expect(rtf).not.toContain('rtf-narrative-link');
        expect(rtf).not.toContain('data-target-url');
        expect(rtf).toContain('\\red245\\green222\\blue179;');
        expect(rtf).toContain('\\ul ');
    });

    it('ignores structural newlines from the WinForms scene 2297 fixture', () => {
        const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang3082{\\fonttbl{\\f0\\fnil\\fcharset0 Microsoft Sans Serif;}{\\f1\\fnil Microsoft Sans Serif;}}
{\\colortbl ;\\red245\\green222\\blue179;\\red255\\green255\\blue255;}
{\\*\\generator Riched20 10.0.26100}\\viewkind4\\uc1
\\pard\\cf1\\ul\\f0\\fs24 Citra\\cf2\\ulnone  fue con \\cf1\\ul Faraday\\cf2\\ulnone  a una criba. Un padre de familia que se resisti\\'f3 y por culpa de quien su mujer e hijos debieron haber sido tambi\\'e9n cribados, pero \\cf1\\ul Faraday\\cf2\\ulnone  les perdon\\'f3 la vida y oblig\\'f3 a \\cf1\\ul Citra\\cf2\\ulnone  a mantener el secreto.\\f1\\par
\\par
\\f0 Esa noche \\cf1\\ul Citra\\cf2\\ulnone  le llevaba la leche de la cena tal como el hab\\'eda ordenado hacer d\\'edas atr\\'e1s, pero estaba dormido, as\\'ed que se la tom\\'f3 ella para no desperdiciarla y se qued\\'f3 embelesada con su anillo. Total que fue y lo cogi\\'f3 y \\cf1\\ul Faraday\\cf2\\ulnone  que no estaba dormido la pill\\'f3. Era una prueba que en teor\\'eda hab\\'eda superado y ahora le tocaba pasar a \\cf1\\ul Rowan\\cf2\\ulnone .\\f1\\fs21\\par
}`;

        const text = rtfToPlainText(rtf);

        expect(text.startsWith('Citra fue con Faraday')).toBeTrue();
        expect(text).toContain('secreto.\n\nEsa noche Citra');
        expect(text).toContain('resistió');
        expect(text).toContain('había ordenado hacer días atrás');
        expect(text).not.toMatch(/^\s/);
        expect((text.match(/\n/g) ?? []).length).toBe(2);
    });

    it('restores scoped formatting after nested groups', () => {
        const rtf = '{\\rtf1\\ansi\\pard antes {\\b negrita} despues\\par}';

        const html = rtfToHtml(rtf);

        expect(html).toContain('antes ');
        expect(html).toContain('<strong><span');
        expect(html).toContain('>negrita</span></strong>');
        expect(html).toContain(' despues');
        expect(html.indexOf('</strong>')).toBeLessThan(html.indexOf(' despues'));
    });

    it('decodes unicode controls and skips their fallback characters', () => {
        const rtf = '{\\rtf1\\ansi\\uc1\\pard Unicode \\u8364? y \\u-10179?\\u-8576?\\par}';

        expect(rtfToPlainText(rtf)).toBe('Unicode € y 🚀');
    });

    it('writes astral Unicode as a surrogate pair readable by RTF', () => {
        const rtf = plainTextToRtf('Despegue 🚀');

        expect(rtf).toContain('\\u-10179?\\u-8576?');
        expect(rtfToPlainText(rtf)).toBe('Despegue 🚀');
    });

    it('does not expose unsupported or ignorable destinations as text', () => {
        const rtf = '{\\rtf1\\ansi\\pard Visible {\\*\\unknown secreto} {\\pict datos}final\\par}';

        expect(rtfToPlainText(rtf)).toBe('Visible final');
    });

    it('round-trips font, size, colors and paragraph properties', () => {
        const html = '<p data-rtf-align="center" data-rtf-li="720" data-rtf-sa="120" style="text-align:center;margin-left:36pt;margin-bottom:6pt"><span style="font-family:Georgia;font-size:16pt;color:#123456;background-color:#FEDCBA">Texto</span></p>';
        const rtf = htmlToRtf(html);

        expect(rtf).toContain('Georgia');
        expect(rtf).toContain('\\fs32 ');
        expect(rtf).toContain('\\qc');
        expect(rtf).toContain('\\li720');
        expect(rtf).toContain('\\sa120');
        expect(rtfToHtml(rtf)).toContain('color:#123456');
        expect(rtfToPlainText(rtf)).toBe('Texto');
    });
});
