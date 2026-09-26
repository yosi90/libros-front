import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdaptiveLayoutService } from '../services/ui/adaptive-layout.service';
import { PresentationModeService, WEB_PRESENTATION_ENABLED } from '../services/ui/presentation-mode.service';

/**
 * En Wood y Web, Cuenta y seguridad y Preferencias son apartados del Perfil:
 * la ruta propia redirige al apartado y conserva el sub-apartado en `tab`.
 * La APK y el navegador móvil sin presentación Web mantienen sus pantallas.
 */
export function profileSectionGuard(section: 'security' | 'preferences'): CanActivateFn {
    return route => {
        const presentation = inject(PresentationModeService);
        const layout = inject(AdaptiveLayoutService);
        const webEnabled = inject(WEB_PRESENTATION_ENABLED);
        if (presentation.snapshot.isNativeMobile || (!layout.state().isDesktop && !webEnabled))
            return true;
        const params = route.queryParamMap;
        const tab = params.get('section') ?? params.get('preference');
        return inject(Router).createUrlTree(['/dashboard/profile'], { queryParams: { section, ...(tab ? { tab } : {}) } });
    };
}
