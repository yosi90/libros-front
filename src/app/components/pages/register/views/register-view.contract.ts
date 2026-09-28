import { FormControl, FormGroup } from '@angular/forms';
import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface RegisterViewState {
    form: FormGroup;
    email: FormControl<string | null>;
    password: FormControl<string | null>;
    emailError: string;
    passwordError: string;
    readingQuote: ReadingQuote;
}
