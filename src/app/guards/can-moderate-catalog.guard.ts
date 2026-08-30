import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SessionService } from '../services/auth/session.service';

export const canModerateCatalogGuard: CanActivateFn = () => {
    const session = inject(SessionService);
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
