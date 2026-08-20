import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { BehaviorSubject, EMPTY, auditTime, fromEvent, merge } from 'rxjs';

export type AdaptiveLayoutMode = 'compact' | 'medium' | 'desktop';
export type AdaptiveOrientation = 'portrait' | 'landscape';
export type AdaptivePointer = 'coarse' | 'fine' | 'none';

export interface AdaptiveLayoutState {
    mode: AdaptiveLayoutMode;
    orientation: AdaptiveOrientation;
    pointer: AdaptivePointer;
    width: number;
    height: number;
    layoutHeight: number;
    keyboardInset: number;
    isCompact: boolean;
    isMedium: boolean;
    isDesktop: boolean;
    isWide: boolean;
    isUltrawide: boolean;
    isShort: boolean;
    canHover: boolean;
    hasCoarsePointer: boolean;
    hasFinePointer: boolean;
    prefersReducedMotion: boolean;
    isVirtualKeyboardOpen: boolean;
    canUseDesktopAdministration: boolean;
}

export const ADAPTIVE_LAYOUT_QUERIES = {
    compact: '(max-width: 599px)',
    medium: '(min-width: 600px) and (max-width: 1050px)',
    desktop: '(min-width: 1051px)',
    wide: '(min-width: 1600px)',
    ultrawide: '(min-width: 2560px)',
    portrait: '(orientation: portrait)',
    hover: '(hover: hover)',
    coarsePointer: '(pointer: coarse)',
    finePointer: '(pointer: fine)',
    reducedMotion: '(prefers-reduced-motion: reduce)'
} as const;

const ALL_LAYOUT_QUERIES = Object.values(ADAPTIVE_LAYOUT_QUERIES);
const DEFAULT_STATE: AdaptiveLayoutState = {
    mode: 'desktop',
    orientation: 'landscape',
    pointer: 'fine',
    width: 1440,
    height: 900,
    layoutHeight: 900,
    keyboardInset: 0,
    isCompact: false,
    isMedium: false,
    isDesktop: true,
    isWide: false,
    isUltrawide: false,
    isShort: false,
    canHover: true,
    hasCoarsePointer: false,
    hasFinePointer: true,
    prefersReducedMotion: false,
    isVirtualKeyboardOpen: false,
    canUseDesktopAdministration: true
};

@Injectable({ providedIn: 'root' })
export class AdaptiveLayoutService {
    private readonly browser: boolean;
    private readonly stateSignal = signal<AdaptiveLayoutState>(DEFAULT_STATE);
    private readonly stateSubject = new BehaviorSubject<AdaptiveLayoutState>(DEFAULT_STATE);

    readonly state = this.stateSignal.asReadonly();
    readonly state$ = this.stateSubject.asObservable();

    constructor(
        private breakpoints: BreakpointObserver,
        @Inject(DOCUMENT) private document: Document,
        @Inject(PLATFORM_ID) platformId: object
    ) {
        this.browser = isPlatformBrowser(platformId);
        if (!this.browser)
            return;

        this.refresh();
        this.breakpoints.observe(ALL_LAYOUT_QUERIES).subscribe(() => this.refresh());

        const visualViewport = window.visualViewport;
        const visualResize$ = visualViewport ? fromEvent(visualViewport, 'resize') : EMPTY;
        const visualScroll$ = visualViewport ? fromEvent(visualViewport, 'scroll') : EMPTY;
        merge(fromEvent(window, 'resize'), fromEvent(window, 'orientationchange'), visualResize$, visualScroll$)
            .pipe(auditTime(16))
            .subscribe(() => this.refresh());
    }

    get snapshot(): AdaptiveLayoutState {
        return this.stateSignal();
    }

    private refresh(): void {
        if (!this.browser)
            return;

        const visualViewport = window.visualViewport;
        const width = Math.round(window.innerWidth);
        const layoutHeight = Math.round(window.innerHeight);
        const height = Math.round(visualViewport?.height ?? layoutHeight);
        const keyboardInset = Math.max(0, Math.round(layoutHeight - height - (visualViewport?.offsetTop ?? 0)));
        const isCompact = this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.compact);
        const isMedium = this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.medium);
        const isDesktop = !isCompact && !isMedium;
        const hasCoarsePointer = this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.coarsePointer);
        const hasFinePointer = this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.finePointer);
        const canHover = this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.hover);
        const pointer: AdaptivePointer = hasFinePointer ? 'fine' : hasCoarsePointer ? 'coarse' : 'none';
        const state: AdaptiveLayoutState = {
            mode: isCompact ? 'compact' : isMedium ? 'medium' : 'desktop',
            orientation: this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.portrait) ? 'portrait' : 'landscape',
            pointer,
            width,
            height,
            layoutHeight,
            keyboardInset,
            isCompact,
            isMedium,
            isDesktop,
            isWide: this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.wide),
            isUltrawide: this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.ultrawide),
            isShort: height < 700,
            canHover,
            hasCoarsePointer,
            hasFinePointer,
            prefersReducedMotion: this.breakpoints.isMatched(ADAPTIVE_LAYOUT_QUERIES.reducedMotion),
            isVirtualKeyboardOpen: keyboardInset >= 120,
            canUseDesktopAdministration: isDesktop && hasFinePointer
        };

        this.stateSignal.set(state);
        this.stateSubject.next(state);
        this.publishToDocument(state);
    }

    private publishToDocument(state: AdaptiveLayoutState): void {
        const root = this.document.documentElement;
        root.dataset['layoutMode'] = state.mode;
        root.dataset['orientation'] = state.orientation;
        root.dataset['pointer'] = state.pointer;
        root.dataset['hover'] = state.canHover ? 'available' : 'none';
        root.dataset['wide'] = state.isWide ? 'true' : 'false';
        root.dataset['ultrawide'] = state.isUltrawide ? 'true' : 'false';
        root.dataset['virtualKeyboard'] = state.isVirtualKeyboardOpen ? 'open' : 'closed';
        root.style.setProperty('--app-viewport-width', `${state.width}px`);
        root.style.setProperty('--app-viewport-height', `${state.height}px`);
        root.style.setProperty('--app-layout-height', `${state.layoutHeight}px`);
        root.style.setProperty('--app-keyboard-inset', `${state.keyboardInset}px`);
    }
}
