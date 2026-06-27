import {
    applyLibrarySearch,
    getLatestLibraryStatus,
    isPurchasedLibraryStatus,
    parseLibraryTextFilters,
    SearchableLibraryItem
} from './library-search';

describe('library-search', () => {
    const mistborn: SearchableLibraryItem = {
        id: 1,
        kind: 'book',
        title: 'El imperio final',
        authors: ['Brandon Sanderson'],
        universeName: 'Cosmere',
        sagaName: 'Nacidos de la bruma',
        status: 'Leído',
        isPurchased: true
    };

    const stormlight: SearchableLibraryItem = {
        id: 2,
        kind: 'book',
        title: 'El camino de los reyes',
        authors: ['Brandon Sanderson'],
        universeName: 'Cosmere',
        sagaName: 'El archivo de las tormentas',
        status: 'Por comprar',
        isPurchased: false
    };

    const anthology: SearchableLibraryItem = {
        id: 3,
        kind: 'antology',
        title: 'Arcanum ilimitado',
        authors: ['Brandon Sanderson'],
        universeName: 'Cosmere',
        status: 'En espera',
        isPurchased: true
    };

    const earthsea: SearchableLibraryItem = {
        id: 4,
        kind: 'book',
        title: 'Un mago de Terramar',
        authors: ['Ursula K. Le Guin'],
        universeName: 'Terramar',
        sagaName: 'Terramar',
        status: 'Leído',
        isPurchased: true
    };

    const items = [mistborn, stormlight, anthology, earthsea];

    it('filters by scoped title, author, universe and saga chips', () => {
        expect(applyLibrarySearch(items, 'title:imperio', 'all')).toEqual([mistborn]);
        expect(applyLibrarySearch(items, 'author:ursula', 'all')).toEqual([earthsea]);
        expect(applyLibrarySearch(items, 'universe:cosmere', 'all')).toEqual([mistborn, stormlight, anthology]);
        expect(applyLibrarySearch(items, 'saga:tormentas', 'all')).toEqual([stormlight]);
    });

    it('filters by general text across library fields', () => {
        expect(applyLibrarySearch(items, 'antologia', 'all')).toEqual([anthology]);
        expect(applyLibrarySearch(items, 'por comprar', 'all')).toEqual([stormlight]);
    });

    it('requires every chip to match', () => {
        expect(applyLibrarySearch(items, 'author:sanderson\nsaga:bruma', 'all')).toEqual([mistborn]);
        expect(applyLibrarySearch(items, 'author:sanderson\nsaga:terramar', 'all')).toEqual([]);
    });

    it('allows general chips to match saga while scoped title chips match title', () => {
        expect(applyLibrarySearch(items, 'Archiv\ntitulo: reye', 'all')).toEqual([stormlight]);
    });

    it('applies availability filters to books and anthologies', () => {
        expect(applyLibrarySearch(items, '', 'purchased')).toEqual([mistborn, anthology, earthsea]);
        expect(applyLibrarySearch(items, '', 'unpurchased')).toEqual([stormlight]);
    });

    it('normalizes accents and case', () => {
        expect(applyLibrarySearch(items, 'TITLE:IMPERIO', 'all')).toEqual([mistborn]);
        expect(applyLibrarySearch(items, 'titulo:arcanum ilimitádo', 'all')).toEqual([anthology]);
    });

    it('parses Spanish aliases for scoped chips', () => {
        expect(parseLibraryTextFilters('autor:Brandon\nuniverso:Cosmere\nsaga:Bruma')).toEqual([
            { scope: 'author', value: 'Brandon', raw: 'autor:Brandon' },
            { scope: 'universe', value: 'Cosmere', raw: 'universo:Cosmere' },
            { scope: 'saga', value: 'Bruma', raw: 'saga:Bruma' }
        ]);
    });

    it('derives purchase state from the latest status', () => {
        expect(getLatestLibraryStatus([{ Nombre: 'Por comprar' }, { Nombre: 'Leído' }])).toBe('Leído');
        expect(isPurchasedLibraryStatus('Leído')).toBeTrue();
        expect(isPurchasedLibraryStatus('Por comprar')).toBeFalse();
        expect(isPurchasedLibraryStatus('Quiero leer')).toBeTrue();
        expect(isPurchasedLibraryStatus('Descartado')).toBeFalse();
    });
});
