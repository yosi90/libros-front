import { autosaveStatusIcon, autosaveStatusLabel } from './autosave-status';

describe('autosave-status', () => {
    it('da el texto y el icono de cada estado, con el «sin guardar» de quien lo pide', () => {
        const invalid = () => 'Sin guardar: falta texto';
        expect(['idle', 'saving', 'saved', 'error', 'invalid'].map(status => autosaveStatusLabel(status as never, invalid)))
            .toEqual(['', 'Guardando…', 'Guardado', 'Error al guardar', 'Sin guardar: falta texto']);
        expect(['idle', 'saving', 'saved', 'error', 'invalid'].map(status => autosaveStatusIcon(status as never)))
            .toEqual(['cloud_queue', 'sync', 'cloud_done', 'cloud_off', 'warning']);
    });
});
