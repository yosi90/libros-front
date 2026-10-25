import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { filter, map, take } from 'rxjs';
import { PlatformSessionService } from '../services/auth/platform-session.service';
import { safeReturnUrl } from '../components/pages/home/home.facade';

/** La portada es la vista sin sesión: con la cuenta ya lista se vuelve a donde se pidió entrar (`?volver=`). */
export const notAuthGuard: CanActivateFn = (route) => {
    const session = inject(PlatformSessionService);
    const router = inject(Router);

    // Espera a que se sepa si hay cuenta y, si la hay, a que Libros sepa quién es.
    return session.access$.pipe(
        filter(access => access !== 'comprobando' && access !== 'cargando'),
        take(1),
        map(() => session.userIsLogged ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('volver'))) : true)
    );
};
