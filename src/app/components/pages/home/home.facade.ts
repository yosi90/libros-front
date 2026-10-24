import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter } from 'rxjs';
import { LibraryAccessState, PlatformSessionService } from '../../../services/auth/platform-session.service';
import { getRandomReadingQuote } from '../../../shared/reading-quotes';

/** Solo se vuelve a rutas propias de Libros: nunca a otra web ni a una dirección absoluta. */
export function safeReturnUrl(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
    return /^\/(?:dashboard|book\/)/.test(value) ? value : '/dashboard';
}

/** Lo que explica la portada cuando hay cuenta de Yosiftware pero aún no se puede entrar en la biblioteca. */
export function homeNotice(access: LibraryAccessState): string | null {
    switch (access) {
        case 'cargando': return 'Abriendo tu biblioteca…';
        case 'error': return 'No hemos podido abrir tu biblioteca. Comprueba tu conexión y vuelve a intentarlo.';
        case 'cuenta_borrada': return 'Tu cuenta de Yosiftware se ha borrado. Puedes entrar con otra.';
        case 'no_disponible': return 'Ahora mismo no podemos comprobar tu cuenta de Yosiftware. Lo volvemos a intentar solos.';
        default: return null;
    }
}

/**
 * Estado de la portada (la vista sin sesión) compartido por sus presentaciones.
 *
 * La cita se crea una sola vez por instancia de ruta. Entrar y crear la cuenta los abre el SDK de la plataforma
 * (`<yosi-acceso>`); cuando Libros ya sabe quién es la cuenta, se vuelve a donde se pidió entrar (`?volver=`).
 */
@Injectable()
export class HomeFacade {
    private readonly session = inject(PlatformSessionService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute, { optional: true });

    readonly readingQuote = signal(getRandomReadingQuote());
    readonly access = toSignal(this.session.access$, { initialValue: this.session.access });

    constructor() {
        this.session.userIsLogged$.pipe(filter(logged => logged), takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => void this.router.navigateByUrl(safeReturnUrl(this.route?.snapshot.queryParamMap.get('volver')), { replaceUrl: true }));
    }

    notice(): string | null {
        return homeNotice(this.access());
    }

    canRetry(): boolean {
        return this.access() === 'error';
    }

    entrar(vista: 'entrar' | 'registro' = 'entrar'): void {
        void this.session.entrar(vista).catch(() => undefined);
    }

    retry(): void {
        this.session.retry();
    }
}
