import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/auth/session.service';
import { Router } from '@angular/router';
import { map, take } from 'rxjs';

export const isAdminGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    const router = inject(Router);

    return session.userIsLogged$.pipe(
        take(1),
        map(isLogged => {
            return isLogged && session.userRole === 'Admin'
                ? true
                : router.createUrlTree(['/home']);
        })
    );
};