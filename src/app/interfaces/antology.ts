import { BookSimple } from "./book";
import { ReadingState, ReadingStatusId } from "./read-status";
import type { CollectionWorkFields } from "./work";

export interface AnthologySection extends BookSimple {
    PaginaInicio?: number | null;
    PaginaFinal?: number | null;
}

export interface AnthologySectionCollectionContext {
    AntologiaId: number;
    LibroId: number;
    EstadoActual: ReadingState | null;
    Estados: ReadingState[];
    Puntuacion: number | null;
    Resena: string | null;
    FechaActualizacion: string | null;
}

export interface AnthologySectionCollectionWrite {
    EstadoId?: ReadingStatusId;
    Puntuacion?: number | null;
    Resena?: string | null;
    Fecha?: string | null;
}

export interface AnthologySectionCollectionUpdated {
    success: boolean;
    Seccion: AnthologySectionCollectionContext;
}

export interface AnthologySectionProgress {
    LibroId: number;
    Nombre: string;
    Portada?: string | null;
    PaginaInicio?: number | null;
    PaginaFinal?: number | null;
    PorcentajeCompletado?: number | null;
}

export interface Antology extends CollectionWorkFields {
    Secciones?: AnthologySection[];
    Libros?: AnthologySection[];
    SeccionesProgreso?: AnthologySectionProgress[];
    Tipo?: 'antologia';
}
