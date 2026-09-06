import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

interface AnthologyReturnFrame {
    kind: 'anthology';
    anthologyId: number;
    route: '/dashboard/books';
    restoreFromForwardedOverlay: boolean;
}

type MobileFullscreenReturnFrame = AnthologyReturnFrame;

/**
 * Conserva el padre de una superficie Mobile cuando una acción de esa
 * superficie necesita navegar a otra ruta. La ruta es solo el mecanismo de
 * transporte: al regresar se reconstruye primero la superficie anterior.
 */
@Injectable({ providedIn: 'root' })
export class MobileFullscreenReturnService {
    private frame: MobileFullscreenReturnFrame | null = null;
    private restoring = false;

    constructor(private router: Router) { }

    rememberAnthology(anthologyId: number, restoreFromForwardedOverlay = false): void {
        if (!Number.isInteger(anthologyId) || anthologyId < 1)
            return;
        this.frame = { kind: 'anthology', anthologyId, route: '/dashboard/books', restoreFromForwardedOverlay };
    }

    consumeAnthology(): number | null {
        if (this.frame?.kind !== 'anthology' || this.routePath(this.router.url) !== this.frame.route)
            return null;
        const anthologyId = this.frame.anthologyId;
        this.frame = null;
        this.restoring = false;
        return anthologyId;
    }

    restorePrevious(): boolean {
        const frame = this.frame;
        if (!frame || this.restoring)
            return false;
        this.restoring = true;
        void this.router.navigateByUrl(frame.route).then(navigated => {
            if (navigated)
                return;
            this.frame = null;
            this.restoring = false;
            void this.router.navigateByUrl('/dashboard/books');
        });
        return true;
    }

    restoreForwardedOverlay(): boolean {
        return !!this.frame?.restoreFromForwardedOverlay && this.restorePrevious();
    }

    clear(): void {
        this.frame = null;
        this.restoring = false;
    }

    private routePath(url: string): string {
        return url.split('?')[0];
    }
}
