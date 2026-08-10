import { SessionService } from '../auth/session.service';
import { NarrativeEditorFontPreferenceService } from './narrative-editor-font-preference.service';

describe('NarrativeEditorFontPreferenceService', () => {
    let session: Pick<SessionService, 'userId'>;
    let service: NarrativeEditorFontPreferenceService;

    beforeEach(() => {
        localStorage.removeItem('narrative-editor-fonts:v1:7');
        localStorage.removeItem('narrative-editor-fonts:v1:8');
        session = { userId: 7 };
        service = new NarrativeEditorFontPreferenceService(session as SessionService);
    });

    afterEach(() => {
        localStorage.removeItem('narrative-editor-fonts:v1:7');
        localStorage.removeItem('narrative-editor-fonts:v1:8');
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
        const stored = JSON.parse(localStorage.getItem('narrative-editor-fonts:v1:7') ?? '{}');

        expect(stored.books.map((item: { bookId: number }) => item.bookId)).toEqual([5, 4, 3, 2]);
    });

    it('isolates preferences by account', () => {
        service.rememberFont(10, 'Lato');
        session.userId = 8;

        expect(service.preferredFont(10)).toBe('Microsoft Sans Serif');
    });
});
