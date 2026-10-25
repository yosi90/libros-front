import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdaptiveLayoutService } from '../services/ui/adaptive-layout.service';
import { WEB_PRESENTATION_ENABLED } from '../services/ui/presentation-mode.service';

/**
 * En Wood y Web, Cuenta y seguridad y Preferencias son apartados del Perfil:
 * la ruta propia redirige al apartado y conserva el sub-apartado en `tab`.
 * El navegador móvil sin presentación Web (Mobile) mantiene sus pantallas.
 */
export function profileSectionGuard(section: 'security' | 'preferences'): CanActivateFn {
    return route => {
        const layout = inject(AdaptiveLayoutService);
        const webEnabled = inject(WEB_PRESENTATION_ENABLED);
        if (!layout.state().isDesktop && !webEnabled)
            return true;
        const params = route.queryParamMap;
        const tab = params.get('section') ?? params.get('preference');
        return inject(Router).createUrlTree(['/dashboard/profile'], { queryParams: { section, ...(tab ? { tab } : {}) } });
    };
}
