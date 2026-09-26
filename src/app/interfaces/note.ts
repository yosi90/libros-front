/** Nota personal de lectura asociada a un libro (`/notas`). `Fecha` la fija el servidor al crearla. */
export interface BookNote {
    Id: number;
    Nombre: string;
    /** Texto plano. */
    Descripcion: string;
    Fecha: string;
    LibroId: number;
}

/** Alta: `Fecha` e índice los asigna el servidor. */
export interface BookNoteCreate {
    Nombre: string;
    Descripcion: string;
    LibroId: number;
}

/** Edición: `Fecha` y `LibroId` son inmutables (`LibroId`, si se envía, debe coincidir). */
export interface BookNoteUpdate {
    Id: number;
    Nombre?: string;
    Descripcion?: string;
    LibroId?: number;
}
