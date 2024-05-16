import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/auth/session.service';

export const notAuthGuard: CanActivateFn = (route, state) => {
    const loginSrv = inject(SessionService);
    const router = inject(Router);
    return !loginSrv.userLoggedBoolean ? true : router.navigate(['/dashboard']);
};
