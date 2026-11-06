import { MENTION_MAX_LENGTH, Mention, mentionInProgress, mentionInsertion, replaceMention } from './mentions';

/** Los mismos casos que la APK (`MencionesTest`). */
describe('mentions', () => {
    const at = (text: string): Mention | null => mentionInProgress(text.replace('|', ''), text.indexOf('|'));

    it('detecta la @ justo antes del cursor', () => {
        expect(at('A su derecha, ya. @cur|')).toEqual({ start: 18, end: 22, query: 'cur' });
        expect(at('@ro| llega tarde')).toEqual({ start: 0, end: 3, query: 'ro' });
        expect(at('(@Go|')).toEqual({ start: 1, end: 4, query: 'Go' });
        expect(at('Hola\n\n@Citr|')).toEqual({ start: 6, end: 11, query: 'Citr' });
        // Con el cursor en medio de la palabra, solo cuenta lo que hay antes.
        expect(at('@Ci|tra')).toEqual({ start: 0, end: 3, query: 'Ci' });
        expect(at('«@Án|')).toEqual({ start: 1, end: 4, query: 'Án' });
    });

    it('no es una mención sin letras, dentro de una palabra ni tras un espacio', () => {
        expect(at('Hola @|')).toBeNull();
        expect(at('yo@correo|')).toBeNull();
        expect(at('@cur ya|')).toBeNull();
        expect(at('@@|')).toBeNull();
        expect(at('@ cur|')).toBeNull();
        expect(at('sin arroba|')).toBeNull();
        expect(at('@' + 'a'.repeat(MENTION_MAX_LENGTH + 1) + '|')).toBeNull();
        expect(mentionInProgress('@cur', 0)).toBeNull();
        expect(mentionInProgress('@cur', 9)).toBeNull();
    });

    it('cambia la mención por el nombre con un espacio', () => {
        const text = 'A su derecha, @cur';
        const mention = mentionInProgress(text, text.length)!;
        expect(replaceMention(text, mention, 'Marie Curie')).toEqual({ text: 'A su derecha, Marie Curie ', caret: 26 });
        // Si detrás ya hay un espacio, no se pone otro; el cursor queda tras él.
        const middle = '@ro llega';
        const other = mentionInProgress(middle, 3)!;
        expect(replaceMention(middle, other, 'Rowan')).toEqual({ text: 'Rowan llega', caret: 6 });
        expect(mentionInsertion(middle, other, 'Rowan')).toBe('Rowan');
    });
});
