import { Author } from "./author";
import type { Edition } from "./catalog";
import { ReadStatus } from "./read-status";

/** Lo que tienen en común un libro y una antología: los datos de la obra y lo que la persona ha dicho de ella. */
export interface WorkFields {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Portada: string;
    ISBN?: string | null;
    Ediciones?: Edition[];
    Sinopsis?: string | null;
    Paginas?: number | null;
    FechaPublicacion?: string | null;
    IdiomasDisponibles?: Array<{ Id: number; Codigo?: string | null; Nombre: string }> | string[] | null;
    Estilos?: Array<{ Id: number; Nombre: string }> | null;
    Estilo?: string | null;
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
}

/** Lo que añade la colección de la persona (`GET /coleccion/…`). */
export interface CollectionWorkFields extends WorkFields {
    FechaAgregado?: string | null;
    FechaActualizacion?: string | null;
    PuedeAbrirNarrativa?: boolean;
    NarrativaPersonalDisponible?: boolean;
}
