import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PresentationModeService } from '../services/ui/presentation-mode.service';

export function canOpenMobileDesignPreview(hostname: string, nativeMobile: boolean): boolean {
    return !nativeMobile && (hostname === '127.0.0.1' || hostname === 'localhost');
}

export const mobileDesignPreviewGuard: CanActivateFn = () => {
    const document = inject(DOCUMENT);
    const presentation = inject(PresentationModeService);
    const router = inject(Router);
    return canOpenMobileDesignPreview(document.location.hostname, presentation.snapshot.isNativeMobile)
        ? true
        : router.createUrlTree(['/home']);
};
