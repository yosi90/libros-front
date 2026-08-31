const GOOGLE_SIGN_IN_CANCELLED_STATUS = '12501';

interface GoogleSignInErrorLike {
    code?: unknown;
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
}

export function isGoogleSignInCancellation(error: unknown): boolean {
    const candidate = error as GoogleSignInErrorLike | null;
    const code = normalized(candidate?.code);
    const message = normalized(candidate?.message);
    const nativeStatus = [candidate?.code, candidate?.status, candidate?.statusCode]
        .some(value => normalized(value) === GOOGLE_SIGN_IN_CANCELLED_STATUS);

    return code === 'auth/popup-closed-by-user'
        || code === 'auth/cancelled-popup-request'
        || code.includes('cancel')
        || message.includes('cancel')
        || nativeStatus
        || /^12501(?:\s*:.*)?$/.test(message);
}

function normalized(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number'
        ? String(value).trim().toLowerCase()
        : '';
}
