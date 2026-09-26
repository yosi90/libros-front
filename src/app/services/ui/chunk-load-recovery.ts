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

/**
 * Tras una publicación, recarga una sola vez para traer la versión nueva. Si ya
 * se recargó hace menos de un minuto no insiste, para no entrar en bucle.
 */
@Injectable()
export class ChunkLoadRecoveryErrorHandler extends ErrorHandler {
    private readonly window = inject(DOCUMENT).defaultView;
    private readonly reload = inject(PWA_RELOAD);

    override handleError(error: unknown): void {
        const cause = (error as { rejection?: unknown })?.rejection ?? error;
        if (isChunkLoadError(cause) && this.reloadOnce())
            return;
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
