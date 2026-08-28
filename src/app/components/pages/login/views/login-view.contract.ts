import { FormControl, FormGroup } from '@angular/forms';
import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface LoginViewState {
    form: FormGroup;
    email: FormControl<string | null>;
    password: FormControl<string | null>;
    phone: FormControl<string | null>;
    phoneCode: FormControl<string | null>;
    emailError: string;
    passwordError: string;
    readingQuote: ReadingQuote;
    busy: boolean;
    linkRequired: boolean;
    googleEnabled: boolean;
    phoneEnabled: boolean;
    phoneStep: 'number' | 'code';
}
