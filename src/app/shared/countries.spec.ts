import { filterCountries, findCountry, normalizeCountrySearch, resolveDeviceCountryCode } from './countries';

describe('countries', () => {
    it('filters names without accents or case and accepts ISO codes', () => {
        expect(normalizeCountrySearch('  ESPAÑA ')).toBe('espana');
        expect(filterCountries('espana').some(country => country.code === 'ES')).toBeTrue();
        expect(filterCountries('mx').some(country => country.code === 'MX')).toBeTrue();
        expect(findCountry('España')?.code).toBe('ES');
    });

    it('resolves the first valid device region without guessing from a bare language', () => {
        expect(resolveDeviceCountryCode(['es-MX', 'es-ES'])).toBe('MX');
        expect(resolveDeviceCountryCode(['es'])).toBeNull();
        expect(resolveDeviceCountryCode(['invalid_locale'])).toBeNull();
    });

    it('returns the full catalogue for an empty query', () => {
        expect(filterCountries('').length).toBeGreaterThan(200);
    });

    it('excludes Estados Unidos and Israel from country selection', () => {
        expect(findCountry('US')).toBeUndefined();
        expect(findCountry('IL')).toBeUndefined();
        expect(filterCountries('').some(country => country.code === 'US' || country.code === 'IL')).toBeFalse();
    });
});
