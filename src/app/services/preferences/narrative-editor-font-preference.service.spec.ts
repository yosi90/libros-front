import { PlatformSessionService } from '../auth/platform-session.service';
import { NarrativeEditorFontPreferenceService } from './narrative-editor-font-preference.service';

describe('NarrativeEditorFontPreferenceService', () => {
    let account: string;
    let session: Pick<PlatformSessionService, 'accountStorageKey'>;
    let service: NarrativeEditorFontPreferenceService;

    beforeEach(() => {
        localStorage.removeItem('narrative-editor-fonts:v1:qa:cuenta-a');
        localStorage.removeItem('narrative-editor-fonts:v1:qa:cuenta-b');
        account = 'cuenta-a';
        session = { accountStorageKey: (prefix: string) => `${prefix}qa:${account}` };
        service = new NarrativeEditorFontPreferenceService(session as PlatformSessionService);
    });

    afterEach(() => {
        localStorage.removeItem('narrative-editor-fonts:v1:qa:cuenta-a');
        localStorage.removeItem('narrative-editor-fonts:v1:qa:cuenta-b');
    });

    it('inherits the account font in a new book and remembers it for that book', () => {
        service.rememberFont(10, 'Montserrat');

        expect(service.preferredFont(11)).toBe('Montserrat');

        service.rememberFont(11, 'Georgia');
        expect(service.preferredFont(10)).toBe('Montserrat');
        expect(service.preferredFont(11)).toBe('Georgia');
    });

    it('keeps only the four most recently used books', () => {
        [1, 2, 3, 4, 5].forEach(bookId => service.rememberFont(bookId, `Font ${bookId}`));
        const stored = JSON.parse(localStorage.getItem('narrative-editor-fonts:v1:qa:cuenta-a') ?? '{}');

        expect(stored.books.map((item: { bookId: number }) => item.bookId)).toEqual([5, 4, 3, 2]);
    });

    it('isolates preferences by environment and Yosiftware account', () => {
        service.rememberFont(10, 'Lato');
        account = 'cuenta-b';

        expect(service.preferredFont(10)).toBe('Microsoft Sans Serif');
    });
});
