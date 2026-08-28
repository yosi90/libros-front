import { FormControl, FormGroup } from '@angular/forms';
import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface RegisterViewState {
    form: FormGroup;
    username: FormControl<string | null>;
    email: FormControl<string | null>;
    password: FormControl<string | null>;
    usernameError: string;
    emailError: string;
    passwordError: string;
    readingQuote: ReadingQuote;
}
