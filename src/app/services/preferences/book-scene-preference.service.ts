import { Injectable } from '@angular/core';
import { PlatformSessionService } from '../auth/platform-session.service';

/**
 * «Escena al abrir un libro»: la cabecera del título divertido a pantalla completa unos segundos al entrar en un libro.
 * Encendida por defecto; se guarda en este dispositivo, por entorno y cuenta, como las demás preferencias de interfaz.
 */
@Injectable({ providedIn: 'root' })
export class BookScenePreferenceService {
    private readonly storagePrefix = 'book-scene:v1:';

    constructor(private session: PlatformSessionService) { }

    get enabled(): boolean {
        const key = this.session.accountStorageKey(this.storagePrefix);
        if (!key) return true;
        try {
            return localStorage.getItem(key) !== 'off';
        } catch {
            return true;
        }
    }

    setEnabled(enabled: boolean): void {
        const key = this.session.accountStorageKey(this.storagePrefix);
        if (!key) return;
        try {
            if (enabled) localStorage.removeItem(key);
            else localStorage.setItem(key, 'off');
        } catch {
            // Sin almacenamiento la escena sigue encendida: es la opción por defecto.
        }
    }
}
