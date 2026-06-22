import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/auth/session.service';
import { Router } from '@angular/router';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (_route, state) => {
    const session = inject(SessionService);
    const router = inject(Router);

    return session.userIsLogged$.pipe(
        take(1),
        map(isLogged => {
            if (!isLogged)
                return router.createUrlTree(['/home']);

            if (!session.canAccessLibrary && state.url !== '/verify-email-pending')
                return router.createUrlTree(['/verify-email-pending']);
            if (session.canAccessLibrary && state.url === '/verify-email-pending')
                return router.createUrlTree(['/dashboard']);

            return true;
        })
    );
};
