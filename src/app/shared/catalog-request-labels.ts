import { CatalogRequest } from '../interfaces/catalog';

export interface CatalogRequestField {
    label: string;
    value: string;
    wide: boolean;
}

const entityLabels: Record<string, string> = {
    autor: 'Autor',
    universo: 'Universo',
    saga: 'Saga',
    libro: 'Libro',
    antologia: 'Antología',
    otro: 'Otra petición'
};

const payloadLabels: Record<string, string> = {
    Nombre: 'Nombre',
    ISBN: 'ISBN',
    Paginas: 'Páginas',
    FechaPublicacion: 'Fecha de publicación',
    Sinopsis: 'Sinopsis',
    Comentario: 'Comentario del usuario',
    Titulo: 'Título',
    Texto: 'Texto'
};

const payloadOrder = ['Nombre', 'Titulo', 'ISBN', 'FechaPublicacion', 'Paginas', 'Sinopsis', 'Comentario', 'Texto'];

/** Etiqueta visible del tipo de una petición de catálogo o de un reporte. */
export function catalogEntityLabel(entityType: string): string {
    return entityLabels[entityType] ?? entityType;
}

export function catalogRequestActionLabel(request: Pick<CatalogRequest, 'Accion' | 'TipoEntidad'>): string {
    if (request.TipoEntidad === 'otro' || request.Accion === 'comentario')
        return 'Comentario libre';
    return request.Accion === 'edicion' ? 'Corrección de ficha' : 'Alta en catálogo';
}

export function catalogRequestPayloadFields(payload: Record<string, unknown> | null | undefined): CatalogRequestField[] {
    if (!payload)
        return [];
    return Object.entries(payload)
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .sort(([left], [right]) => {
            const leftOrder = payloadOrder.indexOf(left);
            const rightOrder = payloadOrder.indexOf(right);
            return (leftOrder < 0 ? payloadOrder.length : leftOrder) - (rightOrder < 0 ? payloadOrder.length : rightOrder);
        })
        .map(([key, value]) => {
            const text = payloadValue(value);
            return { label: payloadLabel(key), value: text, wide: ['Sinopsis', 'Comentario', 'Texto'].includes(key) || text.length > 160 };
        });
}

function payloadLabel(key: string): string {
    return payloadLabels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function payloadValue(value: unknown): string {
    if (Array.isArray(value))
        return value.map(item => payloadValue(item)).join(', ');
    if (typeof value === 'object' && value !== null)
        return Object.entries(value as Record<string, unknown>)
            .map(([key, nestedValue]) => `${payloadLabel(key)}: ${payloadValue(nestedValue)}`)
            .join(' · ');
    return String(value);
}
