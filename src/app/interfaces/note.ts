/** Nota personal de lectura asociada a un libro (`/notas`). */
export interface BookNote {
    Id: number;
    Nombre: string;
    Descripcion: string;
    Fecha?: string | null;
    LibroId: number;
}

export interface BookNoteWrite {
    Id?: number;
    Nombre: string;
    Descripcion: string;
    Fecha?: string;
    LibroId: number;
}
