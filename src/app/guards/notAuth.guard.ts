import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/auth/session.service';

export const notAuthGuard: CanActivateFn = (route, state) => {
    const sessionSrv = inject(SessionService);
    const router = inject(Router);
    return !sessionSrv.userIsLogged ? true : router.navigate(['/dashboard']);
};
