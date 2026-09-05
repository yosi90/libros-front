import { Author } from "./author";
import { BookSimple } from "./book";
import { ReadStatus } from "./read-status";

export interface AnthologySection extends BookSimple {
    PaginaInicio?: number | null;
    PaginaFinal?: number | null;
}

export interface AnthologySectionProgress {
    LibroId: number;
    Nombre: string;
    Portada?: string | null;
    PaginaInicio?: number | null;
    PaginaFinal?: number | null;
    PorcentajeCompletado?: number | null;
}

export interface Antology {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Secciones?: AnthologySection[];
    Libros?: AnthologySection[];
    SeccionesProgreso?: AnthologySectionProgress[];
    Portada: string;
    Tipo?: 'antologia';
    ISBN?: string | null;
    Sinopsis?: string | null;
    Paginas?: number | null;
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
