import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/auth/session.service';
import { Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

export const notAuthGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    const router = inject(Router);

    return session.sessionInitializedSubject.pipe(
        filter(initialized => initialized),
        take(1),
        map(() => {
            if (!session.userIsLogged)
                return true;

            return session.canAccessLibrary
                ? router.createUrlTree(['/dashboard'])
                : router.createUrlTree(['/verify-email-pending']);
        })
    );
};
