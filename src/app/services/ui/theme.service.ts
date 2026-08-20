import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { distinctUntilChanged, map } from 'rxjs';
import { AdaptiveLayoutService } from './adaptive-layout.service';

export type AppTheme = 'wood' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'book-front:theme:v1';
const THEMES: readonly AppTheme[] = ['wood', 'light', 'dark'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly browser: boolean;
    private readonly requestedThemeSignal = signal<AppTheme>('wood');
    private readonly effectiveThemeSignal = signal<AppTheme>('wood');

    readonly requestedTheme = this.requestedThemeSignal.asReadonly();
    readonly effectiveTheme = this.effectiveThemeSignal.asReadonly();

    constructor(
        private adaptiveLayout: AdaptiveLayoutService,
        private overlayContainer: OverlayContainer,
        @Inject(DOCUMENT) private document: Document,
        @Inject(PLATFORM_ID) platformId: object
    ) {
        this.browser = isPlatformBrowser(platformId);
        const requested = this.readPreference();
        this.requestedThemeSignal.set(requested);
        this.apply(requested);

        this.adaptiveLayout.state$.pipe(
            map(state => state.isDesktop),
            distinctUntilChanged()
        ).subscribe(() => this.apply(this.requestedThemeSignal()));
    }

    get snapshot(): { requested: AppTheme; effective: AppTheme } {
        return { requested: this.requestedThemeSignal(), effective: this.effectiveThemeSignal() };
    }

    availableThemes(): readonly AppTheme[] {
        return this.adaptiveLayout.snapshot.isDesktop ? THEMES : ['light', 'dark'];
    }

    setRequestedTheme(theme: AppTheme): void {
        if (!THEMES.includes(theme))
            return;

        this.requestedThemeSignal.set(theme);
        if (this.browser) {
            try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* La preferencia sigue activa en memoria. */ }
        }
        this.apply(theme);
    }

    selectNextTheme(): void {
        const available = this.availableThemes();
        const currentIndex = available.indexOf(this.requestedThemeSignal());
        this.setRequestedTheme(available[(currentIndex + 1) % available.length]);
    }

    private readPreference(): AppTheme {
        if (!this.browser)
            return 'wood';
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            return THEMES.includes(stored as AppTheme) ? stored as AppTheme : 'wood';
        } catch {
            return 'wood';
        }
    }

    private apply(requested: AppTheme): void {
        const effective: AppTheme = requested === 'wood' && !this.adaptiveLayout.snapshot.isDesktop ? 'dark' : requested;
        this.effectiveThemeSignal.set(effective);

        const root = this.document.documentElement;
        root.dataset['themeRequested'] = requested;
        root.dataset['theme'] = effective;

        const overlay = this.overlayContainer.getContainerElement();
        overlay.dataset['themeRequested'] = requested;
        overlay.dataset['theme'] = effective;
        for (const theme of THEMES)
            overlay.classList.toggle(`app-theme-${theme}`, theme === effective);
    }
}
