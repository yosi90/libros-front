import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PresentationModeService } from './presentation-mode.service';

/** Solo escritorio: pantalla ancha y ratón. En táctil y en la APK no existe. */
const DESKTOP_QUERY = '(min-width: 1051px) and (pointer: fine)';

/**
 * Atajo Ctrl+K / ⌘K de la paleta de órdenes. Vive en la carga inicial para
 * escuchar el teclado; la paleta en sí se descarga la primera vez que se pide.
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
    private readonly router = inject(Router);
    private readonly presentation = inject(PresentationModeService);
    private readonly window = inject(DOCUMENT).defaultView;

    /** Se ha pedido al menos una vez: a partir de ahí la paleta está cargada. */
    readonly requested = signal(false);
    readonly open = signal(false);

    constructor() {
        const document = inject(DOCUMENT);
        const listener = (event: KeyboardEvent) => this.onKeydown(event);
        document.addEventListener('keydown', listener);
        inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', listener));
    }

    get available(): boolean {
        const mode = this.presentation.snapshot.activeMode;
        const inApp = /^\/(dashboard|book)(\/|$)/.test(this.router.url);
        return (mode === 'web' || mode === 'wood') && inApp && !!this.window?.matchMedia?.(DESKTOP_QUERY).matches;
    }

    close(): void {
        this.open.set(false);
    }

    private onKeydown(event: KeyboardEvent): void {
        const shortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key?.toLowerCase() === 'k';
        if (!shortcut) return;
        if (this.open()) {
            event.preventDefault();
            this.close();
            return;
        }
        if (!this.available) return;
        event.preventDefault();
        this.requested.set(true);
        this.open.set(true);
    }
}
