import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/auth/session.service';
import { Router } from '@angular/router';
import { map, take } from 'rxjs';

export const notAuthGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    const router = inject(Router);

    return session.userIsLogged$.pipe(
        take(1),
        map(isLogged => {
            if (!isLogged)
                return true;

            return session.canAccessLibrary
                ? router.createUrlTree(['/dashboard'])
                : router.createUrlTree(['/verify-email-pending']);
        })
    );
};
