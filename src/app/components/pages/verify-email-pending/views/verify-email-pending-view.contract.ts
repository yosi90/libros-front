import { ReadingQuote } from '../../../../shared/reading-quotes';

export interface VerifyEmailPendingViewState {
    isResending: boolean;
    userEmail: string;
    readingQuote: ReadingQuote;
}
