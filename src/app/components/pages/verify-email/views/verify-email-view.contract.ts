import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface VerifyEmailViewState {
    isVerifying: boolean;
    verified: boolean;
    failed: boolean;
    readingQuote: ReadingQuote;
}
