import { catalogEntryText } from './catalog-entry';

describe('catalogEntryText', () => {
    it('una alta exacta se enseña con su día', () => {
        expect(catalogEntryText('2026-10-25T10:55:00Z', false)).toBe('25 de octubre de 2026');
    });

    it('una aproximada solo con el mes, y lo dice', () => {
        expect(catalogEntryText('2024-05-31T14:59:40Z', true)).toBe('Desde mayo de 2024 (aproximada)');
    });

    it('sin fecha o con una que no se entiende, nada', () => {
        expect(catalogEntryText(null, false)).toBe('');
        expect(catalogEntryText('no es una fecha', false)).toBe('');
    });
});
