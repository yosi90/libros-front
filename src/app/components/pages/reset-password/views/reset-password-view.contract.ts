import { FormControl, FormGroup } from '@angular/forms';
import { ReadingQuote } from '../../../../shared/reading-quotes';

export type ResetPasswordFlowState = 'checking' | 'form' | 'invalid' | 'managed_return';

export interface ResetPasswordViewState {
    form: FormGroup;
    password: FormControl<string | null>;
    passwordRepeat: FormControl<string | null>;
    passwordError: string;
    passwordRepeatError: string;
    passwordsMatch: boolean;
    actionCode: string;
    flowState: ResetPasswordFlowState;
    readingQuote: ReadingQuote;
}
