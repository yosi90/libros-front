import { Author } from "./author";
import { BookSimple } from "./book";
import { ReadStatus } from "./read-status";

export interface Antology {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Secciones?: BookSimple[];
    Portada: string;
    Tipo?: 'antologia';
    ISBN?: string | null;
    FechaPublicacion?: string | null;
    IdiomasDisponibles?: Array<{ Id: number; Codigo?: string | null; Nombre: string }> | string[] | null;
    Estilos?: Array<{ Id: number; Nombre: string }> | null;
    Estilo?: string | null;
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
    FechaAgregado?: string | null;
    FechaActualizacion?: string | null;
    PuedeAbrirNarrativa?: boolean;
    NarrativaPersonalDisponible?: boolean;
}
