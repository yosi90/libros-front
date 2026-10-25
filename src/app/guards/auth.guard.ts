import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { filter, map, take } from 'rxjs';
import { PlatformSessionService } from '../services/auth/platform-session.service';

/**
 * Lo que necesita sesión la pide: sin cuenta de Yosiftware (o mientras Libros no sabe quién es) se vuelve a la
 * portada, que ofrece entrar con `<yosi-acceso>` y regresa aquí después.
 */
export const authGuard: CanActivateFn = (_route, state) => {
    const session = inject(PlatformSessionService);
    const router = inject(Router);

    // Espera a que se sepa si hay cuenta y, si la hay, a que Libros sepa quién es.
    return session.access$.pipe(
        filter(access => access !== 'comprobando' && access !== 'cargando'),
        take(1),
        map(() => session.userIsLogged
            ? true
            : router.createUrlTree(['/home'], { queryParams: { volver: state.url } }))
    );
};
