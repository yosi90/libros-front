import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/auth/session.service';
import { inject } from '@angular/core';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const loginSrv = inject(SessionService);
  const router = inject(Router);
  return loginSrv.isAdmin ? true : router.navigate(['/home']);
};
