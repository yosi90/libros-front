import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PresentationModeService } from '../services/ui/presentation-mode.service';

export const desktopAdministrationGuard: CanActivateFn = () => {
    const presentation = inject(PresentationModeService);
    const router = inject(Router);
    return presentation.snapshot.canUseDesktopAdministration
        ? true
        : router.createUrlTree(['/dashboard/books']);
};
