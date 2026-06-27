import { ReadStatus, ReadingState, ReadingStatusId } from '../interfaces/read-status';

type StatusLike = Partial<ReadStatus & ReadingState> & {
    Id?: number;
    Fecha?: string;
};

export interface ReadingStatusOption {
    Id: ReadingStatusId;
    Nombre: string;
    icon: string;
}

export const readingStatusOptions: ReadingStatusOption[] = [
    { Id: 0, Nombre: 'En espera', icon: 'schedule' },
    { Id: 1, Nombre: 'En marcha', icon: 'auto_stories' },
    { Id: 2, Nombre: 'Leído', icon: 'done_all' },
    { Id: 3, Nombre: 'Por comprar', icon: 'add_shopping_cart' },
    { Id: 4, Nombre: 'Quiero leer', icon: 'bookmark_add' },
    { Id: 5, Nombre: 'Descartado', icon: 'block' }
];

const statusIdByNormalizedName = new Map<string, ReadingStatusId>(
    readingStatusOptions.map(option => [normalizeStatusText(option.Nombre), option.Id])
);

statusIdByNormalizedName.set('leido', 2);

export function normalizeStatusText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function getStatusName(status: StatusLike | undefined): string {
    if (!status)
        return '';

    if ('Nombre' in status && status.Nombre)
        return status.Nombre === 'Leido' ? 'Leído' : status.Nombre;

    if ('Estado' in status && status.Estado)
        return status.Estado === 'Leido' ? 'Leído' : status.Estado;

    const statusId = getStatusId(status);
    return statusId === null ? '' : getStatusOption(statusId).Nombre;
}

export function getStatusId(status: StatusLike | undefined): ReadingStatusId | null {
    if (!status)
        return null;

    if (typeof status.EstadoId === 'number')
        return status.EstadoId as ReadingStatusId;

    const name = getStatusName(status);
    return statusIdByNormalizedName.get(normalizeStatusText(name)) ?? null;
}

export function getLatestStatus<TStatus extends StatusLike>(statuses: TStatus[] | undefined): TStatus | undefined {
    if (!statuses?.length)
        return undefined;

    return statuses[statuses.length - 1];
}

export function getLatestStatusId(statuses: StatusLike[] | undefined): ReadingStatusId | null {
    return getStatusId(getLatestStatus(statuses));
}

export function getLatestStatusName(statuses: StatusLike[] | undefined): string {
    return getStatusName(getLatestStatus(statuses));
}

export function getStatusOption(statusId: ReadingStatusId): ReadingStatusOption {
    return readingStatusOptions.find(option => option.Id === statusId) ?? readingStatusOptions[0];
}

export function getStatusIcon(status: StatusLike | undefined): string {
    const statusId = getStatusId(status);
    return statusId === null ? 'help_outline' : getStatusOption(statusId).icon;
}

export function getStatusClass(status: StatusLike | string | undefined): string {
    const name = typeof status === 'string' ? status : getStatusName(status);
    return normalizeStatusText(name).replace(/\s+/g, '_');
}

export function isPurchasedStatus(status: StatusLike | string | undefined): boolean {
    const statusId = typeof status === 'string'
        ? statusIdByNormalizedName.get(normalizeStatusText(status)) ?? null
        : getStatusId(status);

    return statusId !== 3 && statusId !== 5;
}

export function toReadStatus(status: ReadStatus | ReadingState): ReadStatus {
    const statusId = getStatusId(status);
    return {
        Id: status.Id,
        EstadoId: statusId ?? undefined,
        Nombre: getStatusName(status),
        Estado: 'Estado' in status ? status.Estado : getStatusName(status),
        Fecha: status.Fecha
    };
}
