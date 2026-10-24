import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { filter, map, take } from 'rxjs';
import { PlatformSessionService } from '../services/auth/platform-session.service';

/** La portada es la vista sin sesión: con la cuenta ya lista se va a la biblioteca. */
export const notAuthGuard: CanActivateFn = () => {
    const session = inject(PlatformSessionService);
    const router = inject(Router);

    // Espera a que se sepa si hay cuenta y, si la hay, a que Libros sepa quién es.
    return session.access$.pipe(
        filter(access => access !== 'comprobando' && access !== 'cargando'),
        take(1),
        map(() => session.userIsLogged ? router.createUrlTree(['/dashboard']) : true)
    );
};
