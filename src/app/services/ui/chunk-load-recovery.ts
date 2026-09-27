import { DOCUMENT } from '@angular/common';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { PWA_RELOAD } from './pwa-lifecycle.service';

const RELOAD_MARK_KEY = 'libros:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

/**
 * Error de un módulo cargado bajo demanda que ya no existe: la pestaña sigue en
 * una versión anterior a la publicada y el hosting responde el index.html.
 * Chromium, Firefox y Safari lo describen con mensajes distintos.
 */
export function isChunkLoadError(error: unknown): boolean {
    const message = error instanceof Error ? `${error.name} ${error.message}` : String((error as { message?: unknown })?.message ?? error ?? '');
    return /dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|ChunkLoadError/i.test(message);
}

/** Un bloque @defer que no pudo descargar sus dependencias (NG0750). */
function isDeferLoadError(error: unknown): boolean {
    return (error as { code?: unknown })?.code === -750 || /NG0750/.test(String((error as { message?: unknown })?.message ?? ''));
}

/**
 * Tras una publicación, recarga una sola vez para traer la versión nueva. Si ya
 * se recargó hace menos de un minuto no insiste, para no entrar en bucle.
 */
@Injectable()
export class ChunkLoadRecoveryErrorHandler extends ErrorHandler {
    private readonly window = inject(DOCUMENT).defaultView;
    private readonly reload = inject(PWA_RELOAD);
    // Al salir de la página el navegador aborta las importaciones en curso
    // (Safari lo describe igual que un módulo caducado): no es motivo para recargar.
    private unloading = false;

    constructor() {
        super();
        this.window?.addEventListener('pagehide', () => this.unloading = true);
        this.window?.addEventListener('pageshow', () => this.unloading = false);
    }

    override handleError(error: unknown): void {
        const cause = (error as { rejection?: unknown })?.rejection ?? error;
        if (this.unloading && (isChunkLoadError(cause) || isDeferLoadError(cause))) return;
        if (isChunkLoadError(cause) && this.reloadOnce()) return;
        super.handleError(error);
    }

    private reloadOnce(): boolean {
        try {
            const storage = this.window?.sessionStorage;
            const last = Number(storage?.getItem(RELOAD_MARK_KEY) ?? 0);
            if (Date.now() - last < RELOAD_COOLDOWN_MS)
                return false;
            storage?.setItem(RELOAD_MARK_KEY, String(Date.now()));
        } catch {
            return false;
        }
        this.reload();
        return true;
    }
}
