import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DecisionNoticeService } from './decision-notice.service';

export type PolicyBlockCode = 'usage_policy_acceptance_required' | 'creation_policy_acceptance_required';

@Injectable({ providedIn: 'root' })
export class PolicyPromptService {
    static readonly noticeId = 'community-policies';
    private lastGenericRoute: string | null = null;

    constructor(private decisions: DecisionNoticeService, private router: Router) {
        // El aviso puede dispararse antes de la navegación inicial; al llegar a las normas sobra.
        this.router.events?.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => {
            if (isPoliciesRoute(event.urlAfterRedirects)) this.decisions.dismiss(PolicyPromptService.noticeId);
        });
    }

    /**
     * Con `action` (lo que la persona intentaba, p. ej. «añadir libros a tu biblioteca»)
     * el aviso lo nombra y se muestra en cada intento. Sin ella, una vez por ruta: varias
     * lecturas bloqueadas de la misma pantalla avisan una sola vez, pero cada pantalla
     * nueva que falle vuelve a explicar por qué. Nunca tapa la propia sección de normas.
     */
    trigger(code: PolicyBlockCode, action?: string): void {
        const route = this.router.url ?? '';
        if (isPoliciesRoute(route)) return;
        if (!action) {
            const path = route.split(/[?#]/)[0];
            if (this.lastGenericRoute === path) return;
            this.lastGenericRoute = path;
        }
        const creation = code === 'creation_policy_acceptance_required';
        const policy = creation ? 'las normas de creación' : 'las normas de uso';
        const generic = creation ? 'Debes revisar y aceptar las normas de creación antes de publicar contenido.' : 'Debes revisar y aceptar las normas de uso antes de continuar con las funciones sociales.';
        this.decisions.show({
            id: PolicyPromptService.noticeId,
            type: 'system',
            icon: 'policy',
            title: creation ? 'Normas de creación pendientes' : 'Normas de comunidad pendientes',
            message: action ? `Para ${action}, acepta primero ${policy}.` : generic,
            dismissible: true,
            actions: [
                { id: 'review', label: 'Revisar ahora', appearance: 'primary', showInCenter: true, execute: () => this.router.navigate(['/dashboard/account-security'], { queryParams: { section: 'policies' } }) },
                { id: 'later', label: 'Más tarde', appearance: 'secondary', execute: () => void 0 }
            ]
        });
    }

    clear(): void {
        this.lastGenericRoute = null;
        this.decisions.remove(PolicyPromptService.noticeId);
    }
}

// Web y Wood redirigen la sección de cuenta al Perfil (`?section=security&tab=policies`).
function isPoliciesRoute(url: string): boolean {
    const [path, query = ''] = url.split('#')[0].split('?');
    const params = new URLSearchParams(query);
    if (path === '/dashboard/account-security') return params.get('section') === 'policies';
    return path === '/dashboard/profile' && (params.get('tab') === 'policies' || params.get('section') === 'policies');
}
