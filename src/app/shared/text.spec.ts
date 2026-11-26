import { foldText, joinList } from './text';

describe('foldText', () => {
    it('quita tildes y mayúsculas sin tocar los espacios', () => {
        expect(foldText('  Leído en Español ')).toBe('  leido en espanol ');
    });

    it('trata la eñe como n, igual que las copias a las que sustituye', () => {
        expect(foldText('Año Nuevo')).toBe('ano nuevo');
    });
});

describe('joinList', () => {
    it('enumera con comas y la conjunción antes del último', () => {
        expect(joinList(['a'])).toBe('a');
        expect(joinList([2, 3])).toBe('2 y 3');
        expect(joinList(['el título', 'el texto', 'un personaje'])).toBe('el título, el texto y un personaje');
        expect(joinList(['la entrada', 'la relación'], 'ni')).toBe('la entrada ni la relación');
    });
});
