import { Injectable } from '@angular/core';

/** Un editor con cambios que aún no ha enviado a la API (el capítulo, la ficha de una entidad). */
export interface PendingWorkOwner {
    /**
     * La cuenta ha cambiado (o se ha cerrado la sesión): el editor deja de enviar y, si tenía cambios sin guardar, los
     * aparta para la cuenta con la que se escribieron (`stash`). No debe enviar nada más: el token ya es de otra cuenta.
     */
    abandon(): void;
}

export interface StashedWork<T> {
    /** Cuándo se apartaron los cambios. */
    guardado: string;
    borrador: T;
}

const STORAGE_PREFIX = 'libros:pendiente:';

/**
 * El trabajo sin enviar sigue siendo de la cuenta que lo escribió (CAMBIO_DE_CUENTA.md, obligación 4): con un cambio
 * de cuenta, un cierre de sesión o una revocación, los editores abiertos no envían sus cambios con el token de la cuenta
 * nueva, sino que los apartan en el dispositivo por **entorno y cuenta**. Solo esa misma cuenta, en ese entorno, los
 * recupera al volver a abrir lo mismo; otra cuenta no los ve ni los envía. Nunca se borra nada de otras cuentas.
 *
 * `AccountScopeService` fija aquí la cuenta presentada (`setScope`) y avisa de cada cambio (`abandonAll`) antes de vaciar
 * los datos en memoria.
 */
@Injectable({ providedIn: 'root' })
export class PendingWorkService {
    private readonly owners = new Set<PendingWorkOwner>();
    private scopeValue: string | null = null;

    /** Entorno y cuenta de quien está presentada ahora (`null` sin cuenta o mientras cambia). */
    get scope(): string | null { return this.scopeValue; }

    setScope(scope: string | null): void {
        this.scopeValue = scope;
    }

    register(owner: PendingWorkOwner): () => void {
        this.owners.add(owner);
        return () => this.owners.delete(owner);
    }

    /** Antes de presentar otra identidad: cada editor deja de enviar y aparta lo suyo. */
    abandonAll(): void {
        this.scopeValue = null;
        for (const owner of [...this.owners]) {
            try { owner.abandon(); }
            catch { /* Un editor que falla no impide que los demás aparten lo suyo. */ }
        }
    }

    stash<T>(scope: string, key: string, borrador: T): void {
        try {
            const value: StashedWork<T> = { guardado: new Date().toISOString(), borrador };
            localStorage.setItem(this.storageKey(scope, key), JSON.stringify(value));
        } catch { /* Sin almacenamiento, los cambios duran lo que la pestaña. */ }
    }

    /** Los cambios apartados por esta cuenta para `key`, que se retiran del dispositivo al recuperarlos. */
    take<T>(scope: string, key: string): StashedWork<T> | null {
        try {
            const storageKey = this.storageKey(scope, key);
            const raw = localStorage.getItem(storageKey);
            if (!raw) return null;
            localStorage.removeItem(storageKey);
            const value = JSON.parse(raw) as StashedWork<T>;
            return value && typeof value === 'object' && 'borrador' in value ? value : null;
        } catch {
            return null;
        }
    }

    private storageKey(scope: string, key: string): string {
        return `${STORAGE_PREFIX}${scope}:${key}`;
    }
}
