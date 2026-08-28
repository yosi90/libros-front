import { FormControl, FormGroup } from '@angular/forms';
import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface ForgotPasswordViewState {
    form: FormGroup;
    email: FormControl<string | null>;
    emailError: string;
    readingQuote: ReadingQuote;
}
