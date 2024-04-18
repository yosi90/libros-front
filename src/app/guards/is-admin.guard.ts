import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from '../services/auth/login.service';
import { inject } from '@angular/core';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const loginSrv = inject(LoginService);
  const router = inject(Router);
  return loginSrv.userAdminBoolean ? true : router.navigate(['/home']);
};
