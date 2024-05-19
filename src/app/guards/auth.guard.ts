import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/auth/session.service';

export const authGuard: CanActivateFn = (route, state) => {
    const loginSrv = inject(SessionService);
    const router = inject(Router);
    return loginSrv.userIsLogged ? true : router.navigate(['/home']);
};
