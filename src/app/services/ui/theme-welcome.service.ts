import { computed, effect, Injectable, signal, Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PlatformSessionService } from '../auth/platform-session.service';
import { DecisionNoticeService } from '../navigation/decision-notice.service';
import { WebThemeService } from './web-theme.service';

const ONBOARDED_PREFIX = 'libros:theme-onboarded:';
const LIBRARY_PATH = '/dashboard/books';

/**
 * Estado de la bienvenida de estilo: la primera vez que una cuenta llega a la
 * Biblioteca en un dispositivo sin estilo elegido, elige entre Claro, Oscuro y Wood. Vive fuera del componente
 * (que se carga en diferido) para retener desde el arranque los avisos de
 * decisión, como las normas pendientes: esperan en la campana y se presentan
 * cuando la persona ya ha elegido su estilo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeWelcomeService {
    private readonly url = signal('');
    private readonly dismissedUserId = signal<number | null>(null);
    private readonly logged: Signal<boolean>;
    /** Destino de la navegación en curso o, sin ella, la ruta actual: al entrar, el aviso puede llegar antes de que termine. */
    private readonly route = computed(() => this.router.currentNavigation()?.extractedUrl.toString() ?? this.url());

    /** Cuenta nueva, en la Biblioteca y sin haber pasado ya por la bienvenida en el dispositivo. */
    readonly visible = computed(() =>
        this.pendingForUser()
        && this.webTheme.choiceUnset() === true
        && this.route().split('?')[0] === LIBRARY_PATH);

    /** Mientras se decide si procede la bienvenida o está abierta, los avisos esperan. */
    private readonly holdsNotices = computed(() => this.pendingForUser() && (this.webTheme.choiceUnset() === null || this.visible()));

    constructor(
        private webTheme: WebThemeService,
        private session: PlatformSessionService,
        private decisions: DecisionNoticeService,
        private router: Router
    ) {
        this.logged = toSignal(this.session.userIsLogged$, { initialValue: this.session.userIsLogged });
        this.url.set(router.url);
        router.events.pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(event => this.url.set((event as NavigationEnd).urlAfterRedirects));
        this.decisions.holdWhile(() => this.holdsNotices());
        effect(() => {
            if (!this.holdsNotices()) untracked(() => this.decisions.releaseHeld());
        });
    }

    /** La persona eligió su estilo: no se vuelve a ofrecer en este dispositivo. */
    complete(): void {
        const key = this.session.accountStorageKey(ONBOARDED_PREFIX);
        try { if (key) localStorage.setItem(key, '1'); }
        catch { /* Navegación privada: basta con cerrarla en esta sesión. */ }
        this.dismissedUserId.set(this.session.userId);
    }

    private pendingForUser(): boolean {
        // `logged` cambia con cada inicio y cierre de sesión y fuerza a releer el usuario activo.
        if (!this.webTheme.enabled || !this.logged()) return false;
        const userId = this.session.userId;
        return this.dismissedUserId() !== userId
            && !this.alreadyOnboarded();
    }

    /** Se recuerda por entorno y cuenta de Yosiftware (CAMBIO_DE_CUENTA.md, obligación 4). */
    private alreadyOnboarded(): boolean {
        const key = this.session.accountStorageKey(ONBOARDED_PREFIX);
        try { return !!key && localStorage.getItem(key) === '1'; }
        catch { return false; }
    }
}
