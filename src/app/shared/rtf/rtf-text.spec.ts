import { htmlToRtf, plainTextToRtf, rtfToHtml, rtfToPlainText } from './rtf-text';

describe('rtf-text', () => {
    it('keeps legacy plain RTF readable as plain text', () => {
        const rtf = plainTextToRtf('Linea uno\nLinea dos');

        expect(rtfToPlainText(rtf)).toBe('Linea uno\nLinea dos');
    });

    it('converts basic RTF inline formatting to editor HTML', () => {
        const rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Microsoft Sans Serif;}}\\viewkind4\\uc1\\pard\\f0\\fs24 Normal \\b negrita\\b0  \\i cursiva\\i0  \\ul subrayado\\ulnone  \\strike tachado\\strike0\\par}';

        expect(rtfToHtml(rtf)).toBe('Normal <strong>negrita</strong> <em>cursiva</em> <u>subrayado</u> <s>tachado</s>');
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

        expect(rtf).toContain('Linea uno\\par Linea dos');
        expect(rtfToPlainText(rtf)).toBe('Linea uno\nLinea dos');
    });

    it('trims empty editor blocks around the persisted text', () => {
        const rtf = htmlToRtf('<div><br></div><div><br></div><div>Linea uno</div>');

        expect(rtf).not.toContain('\\fs24 \\par');
        expect(rtfToPlainText(rtf)).toBe('Linea uno');
    });

    it('does not persist visual narrative link wrappers', () => {
        const rtf = htmlToRtf('<span class="rtf-narrative-link" data-target-url="/book/1/characters?selected=2">Velo</span>');

        expect(rtfToPlainText(rtf)).toBe('Velo');
        expect(rtf).not.toContain('rtf-narrative-link');
        expect(rtf).not.toContain('data-target-url');
    });
});
