import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdaptiveLayoutService } from '../services/ui/adaptive-layout.service';

export const desktopAdministrationGuard: CanActivateFn = () => {
    const layout = inject(AdaptiveLayoutService);
    const router = inject(Router);
    return layout.snapshot.canUseDesktopAdministration
        ? true
        : router.createUrlTree(['/dashboard/books']);
};
