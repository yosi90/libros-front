import { Injectable } from '@angular/core';
import { PlatformSessionService } from '../auth/platform-session.service';
import { BOOK_ELEMENT_TYPES } from '../../shared/book-element-types';

/**
 * El último tipo de elemento abierto (Personajes, Citas…): «Elementos» vuelve a él. Se guarda en este dispositivo,
 * por entorno y cuenta, como las demás preferencias de interfaz.
 */
@Injectable({ providedIn: 'root' })
export class BookElementTypePreferenceService {
    private readonly storagePrefix = 'book-element-type:v1:';
    /** Por clave (entorno y cuenta): otra cuenta no hereda el tipo, aunque no haya almacenamiento. */
    private readonly memory = new Map<string, string>();

    constructor(private session: PlatformSessionService) { }

    /** La ruta de la lista del último tipo usado; Personajes si no hay ninguno. */
    get listRoute(): string {
        const key = this.session.accountStorageKey(this.storagePrefix);
        const stored = key ? this.memory.get(key) ?? this.read(key) : null;
        return BOOK_ELEMENT_TYPES.some(type => type.listRoute === stored) ? stored! : BOOK_ELEMENT_TYPES[0].listRoute;
    }

    remember(listRoute: string): void {
        const key = this.session.accountStorageKey(this.storagePrefix);
        if (!key || this.memory.get(key) === listRoute) return;
        this.memory.set(key, listRoute);
        try {
            localStorage.setItem(key, listRoute);
        } catch {
            // Sin almacenamiento se recuerda mientras dure la sesión de la página.
        }
    }

    private read(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
}
