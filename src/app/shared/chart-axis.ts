/**
 * Escala para ejes de recuentos enteros en ApexCharts. Sin ella, Apex reparte
 * marcas fraccionarias (1,2 · 1,4…) o, al redondearlas, repite valores (1, 1, 2, 2…).
 */
export interface IntegerAxisScale {
    min: number;
    max: number;
    tickAmount: number;
    decimalsInFloat: number;
    forceNiceScale: boolean;
}

export function integerAxisScale(maxValue: number, maxTicks = 8): IntegerAxisScale {
    const safeMax = Math.max(1, Math.ceil(maxValue));
    const tickAmount = Math.min(safeMax, maxTicks);
    const step = Math.ceil(safeMax / tickAmount);
    return {
        min: 0,
        max: step * tickAmount,
        tickAmount,
        decimalsInFloat: 0,
        forceNiceScale: false
    };
}

/** Etiquetas enteras para el eje de valores de barras horizontales, donde Apex ignora decimalsInFloat. */
export function integerAxisLabel(value: string | number): string {
    return String(Math.round(Number(value)));
}
