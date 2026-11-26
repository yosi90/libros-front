import { HttpErrorResponse } from '@angular/common/http';

/**
 * El estado del guardado automático (capítulo, ficha de elemento y nota). `offline`: el envío falló por no haber red;
 * lo escrito sigue en el dispositivo (`PendingWorkService`) y se vuelve a enviar al volver la conexión.
 */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'invalid' | 'offline';

/** El envío no llegó al servidor por falta de red (no es un error de la API). */
export function isOfflineError(error: unknown): boolean {
    return (typeof navigator !== 'undefined' && navigator.onLine === false)
        || (error instanceof HttpErrorResponse && error.status === 0);
}

/** El icono de cada estado: la nube que se sincroniza, guardada o sin conexión, y el aviso de que falta algo. */
export function autosaveStatusIcon(status: AutosaveStatus): string {
    switch (status) {
        case 'saving': return 'sync';
        case 'saved': return 'cloud_done';
        case 'error': return 'cloud_off';
        case 'invalid': return 'warning';
        case 'offline': return 'cloud_off';
        default: return 'cloud_queue';
    }
}

/** Lo que dice el indicador; el texto de «sin guardar» lo pone quien sabe qué falta. Sin estado, nada. */
export function autosaveStatusLabel(status: AutosaveStatus, invalidLabel: () => string): string {
    switch (status) {
        case 'saving': return 'Guardando…';
        case 'saved': return 'Guardado';
        case 'error': return 'Error al guardar';
        case 'invalid': return invalidLabel();
        case 'offline': return 'Sin conexión · guardado en el dispositivo';
        default: return '';
    }
}
