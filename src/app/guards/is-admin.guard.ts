import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { SessionService } from '../services/auth/session.service';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs';

export const isAdminGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.sessionInitializedSubject.value) {
    await session.sessionInitializedSubject.pipe(filter(init => init), take(1)).toPromise();
  }

  return session.userRole === 'admin' ? true : router.createUrlTree(['/home']);
};
