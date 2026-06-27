import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { SessionService } from '../services/auth/session.service';

export const canModerateCatalogGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    const router = inject(Router);

    return session.userIsLogged$.pipe(
        take(1),
        map(isLogged => {
            return isLogged && session.canAccessLibrary && session.canModerateCatalog
                ? true
                : router.createUrlTree(['/dashboard/books']);
        })
    );
};
