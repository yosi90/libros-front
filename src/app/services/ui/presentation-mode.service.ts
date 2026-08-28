import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AdaptiveLayoutService, AdaptiveLayoutState } from './adaptive-layout.service';

export type PresentationMode = 'wood' | 'mobile' | 'native-mobile';

export interface PresentationState {
    targetMode: PresentationMode;
    mobilePresentationEnabled: boolean;
    isWoodTarget: boolean;
    isMobileTarget: boolean;
    isNativeMobile: boolean;
    canUseDesktopAdministration: boolean;
}

interface CapacitorRuntime {
    isNativePlatform?: () => boolean;
}

interface GlobalWithCapacitor {
    Capacitor?: CapacitorRuntime;
}

function detectNativeMobile(): boolean {
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

const DEFAULT_STATE: PresentationState = {
    targetMode: 'wood',
    mobilePresentationEnabled: false,
    isWoodTarget: true,
    isMobileTarget: false,
    isNativeMobile: false,
    canUseDesktopAdministration: true
};

@Injectable({ providedIn: 'root' })
export class PresentationModeService {
    private readonly stateSignal = signal<PresentationState>(DEFAULT_STATE);
    private readonly stateSubject = new BehaviorSubject<PresentationState>(DEFAULT_STATE);

    readonly state = this.stateSignal.asReadonly();
    readonly state$ = this.stateSubject.asObservable();

    constructor(
        private adaptiveLayout: AdaptiveLayoutService,
        @Inject(MOBILE_PRESENTATION_ENABLED) private mobilePresentationEnabled: boolean,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.refresh(this.adaptiveLayout.snapshot);
        this.adaptiveLayout.state$.pipe(
            map(layout => this.createState(layout)),
            distinctUntilChanged((previous, current) =>
                previous.targetMode === current.targetMode
                && previous.canUseDesktopAdministration === current.canUseDesktopAdministration
            )
        ).subscribe(state => this.publish(state));
    }

    get snapshot(): PresentationState {
        return this.stateSignal();
    }

    private refresh(layout: AdaptiveLayoutState): void {
        this.publish(this.createState(layout));
    }

    private createState(layout: AdaptiveLayoutState): PresentationState {
        const targetMode: PresentationMode = this.nativeMobile
            ? 'native-mobile'
            : layout.isDesktop ? 'wood' : 'mobile';
        const isWoodTarget = targetMode === 'wood';
        return {
            targetMode,
            mobilePresentationEnabled: this.mobilePresentationEnabled,
            isWoodTarget,
            isMobileTarget: !isWoodTarget,
            isNativeMobile: targetMode === 'native-mobile',
            canUseDesktopAdministration: isWoodTarget && layout.hasFinePointer
        };
    }

    private publish(state: PresentationState): void {
        this.stateSignal.set(state);
        this.stateSubject.next(state);
        const root = this.document.documentElement;
        root.dataset['presentationTarget'] = state.targetMode;
        root.dataset['mobilePresentation'] = state.mobilePresentationEnabled ? 'enabled' : 'disabled';
    }
}
