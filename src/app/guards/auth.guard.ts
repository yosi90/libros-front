import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/auth/session.service';
import { filter, take } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
    const loginSrv = inject(SessionService);
    const router = inject(Router);

    if (!loginSrv.sessionInitializedSubject.value) {
        await loginSrv.sessionInitializedSubject
            .pipe(filter(init => init), take(1))
            .toPromise();
    }

    return loginSrv.userIsLogged ? true : router.createUrlTree(['/home']);
};

