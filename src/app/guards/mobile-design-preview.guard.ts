import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export function canOpenMobileDesignPreview(hostname: string): boolean {
    return hostname === '127.0.0.1' || hostname === 'localhost';
}

export const mobileDesignPreviewGuard: CanActivateFn = () => {
    const document = inject(DOCUMENT);
    const router = inject(Router);
    return canOpenMobileDesignPreview(document.location.hostname)
        ? true
        : router.createUrlTree(['/home']);
};
