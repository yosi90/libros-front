import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { PlatformSessionService } from '../services/auth/platform-session.service';

export const canModerateCatalogGuard: CanActivateFn = () => {
    const session = inject(PlatformSessionService);
    const router = inject(Router);

    return session.sessionInitializedSubject.pipe(
        filter(initialized => initialized),
        take(1),
        map(() => {
            return session.userIsLogged && session.canAccessLibrary && session.canModerateCatalog
                ? true
                : router.createUrlTree(['/dashboard/books']);
        })
    );
};
