import { FormControl, FormGroup } from '@angular/forms';
import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface ResetPasswordViewState {
    form: FormGroup;
    password: FormControl<string | null>;
    passwordRepeat: FormControl<string | null>;
    passwordError: string;
    passwordRepeatError: string;
    passwordsMatch: boolean;
    actionCode: string;
    readingQuote: ReadingQuote;
}
