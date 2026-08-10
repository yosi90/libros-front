import { Injectable } from '@angular/core';
import { SessionService } from '../auth/session.service';

export const NARRATIVE_EDITOR_SYSTEM_FONTS = [
    'Arial',
    'Calibri',
    'Courier New',
    'Georgia',
    'Microsoft Sans Serif',
    'Times New Roman'
] as const;

export const NARRATIVE_EDITOR_GOOGLE_FONTS = [
    'Cinzel Decorative',
    'Lato',
    'Luckiest Guy',
    'MedievalSharp',
    'Merriweather',
    'Montserrat',
    'Open Sans',
    'Playfair Display',
    'Roboto'
] as const;

export const DEFAULT_NARRATIVE_EDITOR_FONT = 'Microsoft Sans Serif';

interface BookFontPreference {
    bookId: number;
    font: string;
    lastUsedAt: number;
}

interface NarrativeEditorFontState {
    version: 1;
    defaultFont: string;
    books: BookFontPreference[];
}

@Injectable({ providedIn: 'root' })
export class NarrativeEditorFontPreferenceService {
    private readonly storagePrefix = 'narrative-editor-fonts:v1:';
    private readonly maximumRememberedBooks = 4;

    constructor(private session: SessionService) { }

    preferredFont(bookId: number | null | undefined): string {
        const storageKey = this.storageKey();
        if (!storageKey)
            return DEFAULT_NARRATIVE_EDITOR_FONT;

        const state = this.read(storageKey);
        const normalizedBookId = this.normalizeBookId(bookId);
        const storedBook = normalizedBookId
            ? state.books.find(preference => preference.bookId === normalizedBookId)
            : undefined;
        const font = storedBook?.font ?? state.defaultFont;

        if (normalizedBookId)
            this.write(storageKey, this.withBookPreference(state, normalizedBookId, font));

        return font;
    }

    rememberFont(bookId: number | null | undefined, font: string): void {
        const storageKey = this.storageKey();
        const normalizedFont = this.normalizeFont(font);
        if (!storageKey || !normalizedFont)
            return;

        const state = this.read(storageKey);
        state.defaultFont = normalizedFont;
        const normalizedBookId = this.normalizeBookId(bookId);
        this.write(storageKey, normalizedBookId
            ? this.withBookPreference(state, normalizedBookId, normalizedFont)
            : state);
    }

    private withBookPreference(state: NarrativeEditorFontState, bookId: number, font: string): NarrativeEditorFontState {
        const preference: BookFontPreference = { bookId, font, lastUsedAt: Date.now() };
        return {
            ...state,
            books: [preference, ...state.books.filter(item => item.bookId !== bookId)]
                .slice(0, this.maximumRememberedBooks)
        };
    }

    private read(storageKey: string): NarrativeEditorFontState {
        const fallback: NarrativeEditorFontState = {
            version: 1,
            defaultFont: DEFAULT_NARRATIVE_EDITOR_FONT,
            books: []
        };
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw)
                return fallback;
            const stored = JSON.parse(raw) as Partial<NarrativeEditorFontState>;
            const defaultFont = this.normalizeFont(stored.defaultFont) ?? DEFAULT_NARRATIVE_EDITOR_FONT;
            const books = Array.isArray(stored.books) ? stored.books
                .map(item => this.normalizeBookPreference(item))
                .filter((item): item is BookFontPreference => !!item)
                .sort((left, right) => right.lastUsedAt - left.lastUsedAt)
                .filter((item, index, items) => items.findIndex(candidate => candidate.bookId === item.bookId) === index)
                .slice(0, this.maximumRememberedBooks) : [];
            return { version: 1, defaultFont, books };
        } catch {
            return fallback;
        }
    }

    private write(storageKey: string, state: NarrativeEditorFontState): void {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
            // La preferencia es opcional: el editor sigue funcionando si el almacenamiento está bloqueado.
        }
    }

    private normalizeBookPreference(value: unknown): BookFontPreference | null {
        if (!value || typeof value !== 'object')
            return null;
        const candidate = value as Partial<BookFontPreference>;
        const bookId = this.normalizeBookId(candidate.bookId);
        const font = this.normalizeFont(candidate.font);
        if (!bookId || !font)
            return null;
        return {
            bookId,
            font,
            lastUsedAt: Number.isFinite(candidate.lastUsedAt) ? Number(candidate.lastUsedAt) : 0
        };
    }

    private normalizeBookId(value: number | null | undefined): number | null {
        const bookId = Number(value);
        return Number.isInteger(bookId) && bookId > 0 ? bookId : null;
    }

    private normalizeFont(value: unknown): string | null {
        if (typeof value !== 'string')
            return null;
        const font = value.trim();
        return font.length > 0 && font.length <= 100 && /^[\p{L}\p{N} .,'-]+$/u.test(font) ? font : null;
    }

    private storageKey(): string | null {
        const userId = Number(this.session.userId);
        return Number.isInteger(userId) && userId > 0 ? `${this.storagePrefix}${userId}` : null;
    }
}
