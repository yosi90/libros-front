import { DOCUMENT } from '@angular/common';
import { inject, Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AdaptiveLayoutService, AdaptiveLayoutState } from './adaptive-layout.service';

export type PresentationMode = 'wood' | 'mobile' | 'native-mobile' | 'web';
export type WebThemeChoice = 'light' | 'dark' | 'wood';

export interface PresentationState {
    targetMode: PresentationMode;
    activeMode: PresentationMode;
    mobilePresentationEnabled: boolean;
    mobilePresentationPreview: boolean;
    isWoodTarget: boolean;
    isMobileTarget: boolean;
    isWoodPresentationActive: boolean;
    isMobilePresentationActive: boolean;
    isNativeMobile: boolean;
    canUseDesktopAdministration: boolean;
    /** Navegador bajo el modelo Web (flag activa): el tema lo decide WebThemeService. */
    isWebPresentation: boolean;
    webThemeChoice: WebThemeChoice | null;
}

interface CapacitorRuntime {
    isNativePlatform?: () => boolean;
}

interface GlobalWithCapacitor {
    Capacitor?: CapacitorRuntime;
}

export function detectNativeMobile(): boolean {
    const runtime = (globalThis as typeof globalThis & GlobalWithCapacitor).Capacitor;
    try {
        return runtime?.isNativePlatform?.() === true;
    } catch {
        return false;
    }
}

export const MOBILE_PRESENTATION_ENABLED = new InjectionToken<boolean>('MOBILE_PRESENTATION_ENABLED', {
    providedIn: 'root',
    factory: () => environment.mobilePresentationEnabled
});

export const NATIVE_MOBILE_PLATFORM = new InjectionToken<boolean>('NATIVE_MOBILE_PLATFORM', {
    providedIn: 'root',
    factory: detectNativeMobile
});

export const WEB_PRESENTATION_ENABLED = new InjectionToken<boolean>('WEB_PRESENTATION_ENABLED', {
    providedIn: 'root',
    factory: () => environment.webPresentationEnabled
});

// Se activa cuando exista el shell Web (Hito 3). Hasta entonces el navegador con
// tema claro/oscuro sigue renderizando Wood en escritorio y Mobile en pantalla pequeña.
export const WEB_VIEWS_READY = new InjectionToken<boolean>('WEB_VIEWS_READY', {
    providedIn: 'root',
    factory: () => false
});

export const MOBILE_PRESENTATION_PREVIEW = new InjectionToken<boolean>('MOBILE_PRESENTATION_PREVIEW', {
    providedIn: 'root',
    factory: () => {
        const window = inject(DOCUMENT).defaultView;
        if (!window || !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            return false;
        }
        return window.localStorage.getItem('book-front:mobile-presentation-preview') === 'true';
    }
});

const DEFAULT_STATE: PresentationState = {
    targetMode: 'wood',
    activeMode: 'wood',
    mobilePresentationEnabled: false,
    mobilePresentationPreview: false,
    isWoodTarget: true,
    isMobileTarget: false,
    isWoodPresentationActive: true,
    isMobilePresentationActive: false,
    isNativeMobile: false,
    canUseDesktopAdministration: true,
    isWebPresentation: false,
    webThemeChoice: null
};

@Injectable({ providedIn: 'root' })
export class PresentationModeService {
    private readonly stateSignal = signal<PresentationState>(DEFAULT_STATE);
    private readonly stateSubject = new BehaviorSubject<PresentationState>(DEFAULT_STATE);
    private readonly webChoiceSubject = new BehaviorSubject<WebThemeChoice | null>(null);

    readonly state = this.stateSignal.asReadonly();
    readonly state$ = this.stateSubject.asObservable();

    constructor(
        private adaptiveLayout: AdaptiveLayoutService,
        @Inject(MOBILE_PRESENTATION_ENABLED) private mobilePresentationEnabled: boolean,
        @Inject(MOBILE_PRESENTATION_PREVIEW) private mobilePresentationPreview: boolean,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean,
        @Inject(DOCUMENT) private document: Document,
        @Inject(WEB_VIEWS_READY) private webViewsReady: boolean
    ) {
        this.refresh(this.adaptiveLayout.snapshot, null);
        combineLatest([this.adaptiveLayout.state$, this.webChoiceSubject]).pipe(
            map(([layout, choice]) => this.createState(layout, choice)),
            distinctUntilChanged((previous, current) =>
                previous.targetMode === current.targetMode
                && previous.canUseDesktopAdministration === current.canUseDesktopAdministration
                && previous.webThemeChoice === current.webThemeChoice
            )
        ).subscribe(state => this.publish(state));
    }

    get snapshot(): PresentationState {
        return this.stateSignal();
    }

    /** WebThemeService se engancha aquí; la APK nunca lo hace. */
    attachWebTheme(choice$: Observable<WebThemeChoice>): void {
        if (this.nativeMobile) return;
        choice$.subscribe(choice => this.webChoiceSubject.next(choice));
    }

    private refresh(layout: AdaptiveLayoutState, choice: WebThemeChoice | null): void {
        this.publish(this.createState(layout, choice));
    }

    private createState(layout: AdaptiveLayoutState, choice: WebThemeChoice | null): PresentationState {
        const isWebPresentation = choice !== null;
        const woodChosen = !isWebPresentation || choice === 'wood';
        const targetMode: PresentationMode = this.nativeMobile
            ? 'native-mobile'
            : layout.isDesktop && (woodChosen || !this.webViewsReady)
                ? 'wood'
                : isWebPresentation && this.webViewsReady ? 'web' : 'mobile';
        const isWoodTarget = targetMode === 'wood';
        const mobilePresentationActive = !isWoodTarget && targetMode !== 'web'
            && (this.nativeMobile || this.mobilePresentationEnabled || this.mobilePresentationPreview);
        const activeMode: PresentationMode = targetMode === 'web' ? 'web' : mobilePresentationActive ? targetMode : 'wood';
        return {
            targetMode,
            activeMode,
            mobilePresentationEnabled: this.mobilePresentationEnabled,
            mobilePresentationPreview: this.mobilePresentationPreview,
            isWoodTarget,
            isMobileTarget: targetMode === 'mobile' || targetMode === 'native-mobile',
            isWoodPresentationActive: activeMode === 'wood',
            isMobilePresentationActive: activeMode === 'mobile' || activeMode === 'native-mobile',
            isNativeMobile: targetMode === 'native-mobile',
            canUseDesktopAdministration: (isWoodTarget || targetMode === 'web') && layout.isDesktop && layout.hasFinePointer,
            isWebPresentation,
            webThemeChoice: choice
        };
    }

    private publish(state: PresentationState): void {
        this.stateSignal.set(state);
        this.stateSubject.next(state);
        const root = this.document.documentElement;
        root.dataset['presentationTarget'] = state.targetMode;
        root.dataset['presentationActive'] = state.activeMode;
        root.dataset['mobilePresentation'] = state.mobilePresentationEnabled ? 'enabled' : 'disabled';
    }
}
