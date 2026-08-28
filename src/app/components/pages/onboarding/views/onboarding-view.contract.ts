import { FormGroup } from '@angular/forms';

export interface OnboardingViewState {
    form: FormGroup;
    policyTitle: string;
    policyMarkdown: string;
    loading: boolean;
}
