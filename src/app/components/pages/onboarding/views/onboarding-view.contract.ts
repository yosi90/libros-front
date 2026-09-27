import { FormGroup } from '@angular/forms';

export interface OnboardingViewState {
    form: FormGroup;
    policyTitle: string;
    policyMarkdown: string;
    loading: boolean;
    /** La política vigente no se pudo cargar: sin ella no se puede completar el alta. */
    policyFailed: boolean;
}
