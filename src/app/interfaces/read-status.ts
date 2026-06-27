export type ReadingStatusId = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReadStatus {
    Id: number;
    Nombre: string;
    Estado?: string;
    EstadoId?: ReadingStatusId;
    Fecha: string;
}

export interface ReadingState {
    Id: number;
    EstadoId: ReadingStatusId;
    Estado?: string;
    Nombre?: string;
    Fecha: string;
}
