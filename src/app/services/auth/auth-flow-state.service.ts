import { Injectable } from '@angular/core';
import { LinkRequired, OnboardingRequired } from '../../interfaces/auth';

export interface OnboardingDraft {
    alias?: string;
    countryCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthFlowStateService {
    private onboardingState: { result: OnboardingRequired; draft: OnboardingDraft } | null = null;
    private linkState: LinkRequired | null = null;

    setOnboarding(result: OnboardingRequired, draft: OnboardingDraft = {}): void {
        this.onboardingState = { result, draft };
    }

    get onboarding() { return this.onboardingState; }

    consumeOnboarding(): { result: OnboardingRequired; draft: OnboardingDraft } | null {
        const state = this.onboardingState;
        this.onboardingState = null;
        return state;
    }

    setLink(result: LinkRequired): void { this.linkState = result; }
    get link(): LinkRequired | null { return this.linkState; }

    consumeLink(): LinkRequired | null {
        const state = this.linkState;
        this.linkState = null;
        return state;
    }

    clear(): void {
        this.onboardingState = null;
        this.linkState = null;
    }
}
