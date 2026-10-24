import { foldText } from './text';

describe('foldText', () => {
    it('quita tildes y mayúsculas sin tocar los espacios', () => {
        expect(foldText('  Leído en Español ')).toBe('  leido en espanol ');
    });

    it('trata la eñe como n, igual que las copias a las que sustituye', () => {
        expect(foldText('Año Nuevo')).toBe('ano nuevo');
    });
});
