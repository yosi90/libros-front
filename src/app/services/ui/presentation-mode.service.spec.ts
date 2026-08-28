import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AdaptiveLayoutService, AdaptiveLayoutState } from './adaptive-layout.service';
import {
    MOBILE_PRESENTATION_ENABLED,
    MOBILE_PRESENTATION_PREVIEW,
    NATIVE_MOBILE_PLATFORM,
    PresentationModeService
} from './presentation-mode.service';

function layout(overrides: Partial<AdaptiveLayoutState> = {}): AdaptiveLayoutState {
    return {
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
        canUseDesktopAdministration: true,
        ...overrides
    };
}

class AdaptiveLayoutStub {
    private readonly subject = new BehaviorSubject<AdaptiveLayoutState>(layout());
    readonly state$ = this.subject.asObservable();

    get snapshot(): AdaptiveLayoutState {
        return this.subject.value;
    }

    set(state: AdaptiveLayoutState): void {
        this.subject.next(state);
    }
}

describe('PresentationModeService', () => {
    function configure(nativeMobile = false, mobileEnabled = false, mobilePreview = false): { service: PresentationModeService; adaptive: AdaptiveLayoutStub } {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                PresentationModeService,
                AdaptiveLayoutStub,
                { provide: AdaptiveLayoutService, useExisting: AdaptiveLayoutStub },
                { provide: MOBILE_PRESENTATION_ENABLED, useValue: mobileEnabled },
                { provide: MOBILE_PRESENTATION_PREVIEW, useValue: mobilePreview },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: nativeMobile }
            ]
        });
        return {
            service: TestBed.inject(PresentationModeService),
            adaptive: TestBed.inject(AdaptiveLayoutStub)
        };
    }

    it('selecciona Wood únicamente por encima de 1050px', () => {
        const { service, adaptive } = configure();
        expect(service.snapshot.targetMode).toBe('wood');
        expect(service.snapshot.canUseDesktopAdministration).toBeTrue();

        adaptive.set(layout({
            mode: 'medium',
            width: 1050,
            isMedium: true,
            isDesktop: false,
            canUseDesktopAdministration: false
        }));

        expect(service.snapshot.targetMode).toBe('mobile');
        expect(service.snapshot.activeMode).toBe('wood');
        expect(service.snapshot.isWoodPresentationActive).toBeTrue();
        expect(service.snapshot.canUseDesktopAdministration).toBeFalse();
    });

    it('fuerza native-mobile y bloquea administración en Capacitor', () => {
        const { service } = configure(true, true);
        expect(service.snapshot.targetMode).toBe('native-mobile');
        expect(service.snapshot.mobilePresentationEnabled).toBeTrue();
        expect(service.snapshot.canUseDesktopAdministration).toBeFalse();
    });

    it('publica el objetivo y la feature flag sin activar Mobile implícitamente', () => {
        const { service, adaptive } = configure(false, false);
        adaptive.set(layout({
            mode: 'compact',
            width: 390,
            isCompact: true,
            isDesktop: false,
            hasFinePointer: false,
            hasCoarsePointer: true,
            pointer: 'coarse',
            canUseDesktopAdministration: false
        }));

        const document = TestBed.inject(DOCUMENT);
        expect(service.snapshot.targetMode).toBe('mobile');
        expect(service.snapshot.mobilePresentationEnabled).toBeFalse();
        expect(document.documentElement.dataset['presentationTarget']).toBe('mobile');
        expect(document.documentElement.dataset['presentationActive']).toBe('wood');
        expect(document.documentElement.dataset['mobilePresentation']).toBe('disabled');
    });

    it('activa Mobile con la flag o la previsualización local', () => {
        const { service, adaptive } = configure(false, false, true);
        adaptive.set(layout({
            mode: 'compact',
            width: 390,
            isCompact: true,
            isDesktop: false,
            hasFinePointer: false,
            hasCoarsePointer: true,
            pointer: 'coarse',
            canUseDesktopAdministration: false
        }));

        expect(service.snapshot.activeMode).toBe('mobile');
        expect(service.snapshot.isMobilePresentationActive).toBeTrue();
    });
});
