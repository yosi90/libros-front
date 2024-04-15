import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from '../services/auth/login.service';

export const authGuard: CanActivateFn = (route, state) => {
    const loginSrv = inject(LoginService);
    const router = inject(Router);
    return loginSrv.userLoggedBoolean ? true : router.navigate(['/home']);
};
