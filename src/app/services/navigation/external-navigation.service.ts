import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

/** Abre un destino externo (la wiki de un libro) en otra pestaña, solo si es `http` o `https`. */
@Injectable({ providedIn: 'root' })
export class ExternalNavigationService {
    constructor(@Inject(DOCUMENT) private document: Document) { }

    async open(value: string): Promise<boolean> {
        const url = this.safeUrl(value);
        if (!url)
            return false;
        return !!this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
    }

    private safeUrl(value: string): string | null {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
        } catch {
            return null;
        }
    }
}
