import { Antology } from "./antology";
import { Author } from "./author";
import { BookSimple } from "./book";

/** Enlace directo a otra saga de la cadena (puede no estar en la colección). */
export interface SagaLink {
    Id: number;
    Nombre: string;
    Subtitulo: string | null;
}

/** Relación con las sagas anteriores y siguientes; la familia y el orden los calcula el backend. */
export interface SagaChain {
    SagasPreviasIds?: number[];
    SagasPrevias?: SagaLink[];
    SagasSiguientes?: SagaLink[];
    FamiliaSagaId?: number;
    OrdenLectura?: number;
}

export interface Saga extends SagaChain {
    Id: number;
    Nombre: string;
    Subtitulo?: string | null;
    /** Solo en el catálogo canónico (`/catalogo/sagas`). */
    UniversoId?: number | null;
    Autores: Author[];
    Libros: BookSimple[];
    Antologias: Antology[];
}
/** Ficha pública de una saga del catálogo (`/catalogo/sagas/{id}/detalle-publico`). */
export interface SagaCatalogDetail extends SagaChain {
    Id: number;
    Nombre: string;
    Subtitulo: string | null;
    UniversoId?: number | null;
    Universo: { Id: number; Nombre: string } | null;
    Autores: Array<{ Id: number; Nombre: string }>;
}

export interface SagaSimple {
    Id: number;
    Nombre: string;
    Subtitulo?: string | null;
}
