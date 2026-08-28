import { DOCUMENT } from '@angular/common';
import { OverlayContainer } from '@angular/cdk/overlay';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AdaptiveLayoutService, AdaptiveLayoutState } from './adaptive-layout.service';
import { ThemeService } from './theme.service';

function layout(overrides: Partial<AdaptiveLayoutState> = {}): AdaptiveLayoutState {
    return {
        mode: 'desktop', orientation: 'landscape', pointer: 'fine', width: 1440, height: 900,
        layoutHeight: 900, keyboardInset: 0, isCompact: false, isMedium: false, isDesktop: true,
        isWide: false, isUltrawide: false, isShort: false, canHover: true, hasCoarsePointer: false,
        hasFinePointer: true, prefersReducedMotion: false, isVirtualKeyboardOpen: false,
        canUseDesktopAdministration: true, ...overrides
    };
}

class AdaptiveLayoutStub {
    private readonly subject = new BehaviorSubject(layout());
    readonly state$ = this.subject.asObservable();
    get snapshot(): AdaptiveLayoutState { return this.subject.value; }
    set(state: AdaptiveLayoutState): void { this.subject.next(state); }
}

class OverlayContainerStub {
    readonly element = document.createElement('div');
    getContainerElement(): HTMLElement { return this.element; }
}

describe('ThemeService presentation contract', () => {
    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                ThemeService,
                AdaptiveLayoutStub,
                OverlayContainerStub,
                { provide: AdaptiveLayoutService, useExisting: AdaptiveLayoutStub },
                { provide: OverlayContainer, useExisting: OverlayContainerStub },
                { provide: PLATFORM_ID, useValue: 'browser' }
            ]
        });
    });

    it('mantiene Wood efectivo en escritorio aunque la preferencia solicitada sea dark', () => {
        const service = TestBed.inject(ThemeService);
        service.setRequestedTheme('dark');

        expect(service.snapshot).toEqual({ requested: 'dark', effective: 'wood' });
        expect(TestBed.inject(DOCUMENT).documentElement.dataset['theme']).toBe('wood');
    });

    it('conserva temporalmente light/dark en el fallback compact/medium', () => {
        const service = TestBed.inject(ThemeService);
        const adaptive = TestBed.inject(AdaptiveLayoutStub);
        service.setRequestedTheme('dark');

        adaptive.set(layout({ mode: 'medium', width: 800, isMedium: true, isDesktop: false }));

        expect(service.snapshot).toEqual({ requested: 'dark', effective: 'dark' });
    });
});
