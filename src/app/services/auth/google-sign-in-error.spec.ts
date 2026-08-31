import { isGoogleSignInCancellation } from './google-sign-in-error';

describe('isGoogleSignInCancellation', () => {
    it('recognizes web and Android cancellations', () => {
        expect(isGoogleSignInCancellation({ code: 'auth/popup-closed-by-user' })).toBeTrue();
        expect(isGoogleSignInCancellation(new Error('Authorization canceled.'))).toBeTrue();
        expect(isGoogleSignInCancellation({ message: '12501: ' })).toBeTrue();
        expect(isGoogleSignInCancellation({ statusCode: 12501 })).toBeTrue();
    });

    it('does not hide configuration or network failures', () => {
        expect(isGoogleSignInCancellation({ code: 'auth/network-request-failed' })).toBeFalse();
        expect(isGoogleSignInCancellation(new Error('Developer error: 10'))).toBeFalse();
    });
});
