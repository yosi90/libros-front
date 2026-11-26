/** El estado del guardado automático (capítulo y ficha de elemento). */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'invalid';

/** El icono de cada estado: la nube que se sincroniza, guardada o sin conexión, y el aviso de que falta algo. */
export function autosaveStatusIcon(status: AutosaveStatus): string {
    switch (status) {
        case 'saving': return 'sync';
        case 'saved': return 'cloud_done';
        case 'error': return 'cloud_off';
        case 'invalid': return 'warning';
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
        default: return '';
    }
}
