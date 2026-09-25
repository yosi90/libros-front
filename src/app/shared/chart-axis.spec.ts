import { integerAxisScale } from './chart-axis';

describe('integerAxisScale', () => {
    it('usa un paso entero y un máximo múltiplo del paso', () => {
        expect(integerAxisScale(2)).toEqual(jasmine.objectContaining({ min: 0, max: 2, tickAmount: 2, decimalsInFloat: 0 }));
        expect(integerAxisScale(10)).toEqual(jasmine.objectContaining({ max: 16, tickAmount: 8 }));
        expect(integerAxisScale(190)).toEqual(jasmine.objectContaining({ max: 192, tickAmount: 8 }));
    });

    it('evita un eje vacío con recuentos a cero', () => {
        expect(integerAxisScale(0)).toEqual(jasmine.objectContaining({ max: 1, tickAmount: 1 }));
    });
});
