import {
    getLatestStatusId,
    getLatestStatusName,
    getStatusClass,
    isPurchasedStatus
} from './reading-status';

describe('reading-status', () => {
    it('normalizes legacy and catalog states by EstadoId', () => {
        expect(getLatestStatusId([{ Id: 1, Nombre: 'Por comprar', Fecha: '' }, { Id: 2, EstadoId: 4, Estado: 'Quiero leer', Fecha: '' }])).toBe(4);
        expect(getLatestStatusName([{ Id: 1, EstadoId: 2, Estado: 'Leido', Fecha: '' }])).toBe('Leído');
    });

    it('derives stable css classes independent of accents', () => {
        expect(getStatusClass({ Id: 1, EstadoId: 2, Estado: 'Leido', Fecha: '' })).toBe('leido');
        expect(getStatusClass({ Id: 2, EstadoId: 4, Estado: 'Quiero leer', Fecha: '' })).toBe('quiero_leer');
        expect(getStatusClass({ Id: 3, EstadoId: 5, Estado: 'Descartado', Fecha: '' })).toBe('descartado');
    });

    it('treats Por comprar and Descartado as not purchased', () => {
        expect(isPurchasedStatus({ Id: 1, Nombre: 'Por comprar', Fecha: '' })).toBeFalse();
        expect(isPurchasedStatus({ Id: 2, EstadoId: 4, Estado: 'Quiero leer', Fecha: '' })).toBeTrue();
        expect(isPurchasedStatus({ Id: 3, EstadoId: 5, Estado: 'Descartado', Fecha: '' })).toBeFalse();
    });
});
