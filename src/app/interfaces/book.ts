import { Author } from "./author";
import { Chapter } from "./chapter";
import { Character, CharacterBookMetrics } from "./character";
import { Concept } from "./concept";
import { event } from "./event";
import { Interlude } from "./interlude";
import { Location } from "./location";
import { Organization } from "./organization";
import { Part } from "./part";
import { Quote } from "./quote";
import { SagaSimple } from "./saga";
import { UniverseSimple } from "./universe";
import type { ReadingPaceBook } from "../shared/reading-pace";
import type { RatingOwn } from "../shared/rating-history";
import type { CollectionWorkFields, WorkFields } from "./work";

export interface Book extends WorkFields {
    Capitulos: Chapter[];
    Partes: Part[];
    Interludios: Interlude[];
    Personajes: Character[];
    MetricasPersonajes?: CharacterBookMetrics;
    /** De la API; aquí solo se lee el ritmo propio en la obra (null sin capítulos fechados). */
    Metricas?: { Ritmo?: ReadingPaceBook | null; Valoracion?: RatingOwn | null };
    Localizaciones: Location[];
    Conceptos: Concept[];
    Organizaciones: Organization[];
    Eventos: event[];
    Citas: Quote[];
    Universo: UniverseSimple;
    Saga: SagaSimple;
    LibrosPrevios?: PreviousBook[];
    SagasPrevias?: PreviousSaga[];
    Wiki?: string | null;
}

export interface PreviousBook {
    Id: number;
    Nombre: string;
    Orden: number;
}

export interface PreviousSaga {
    Id: number;
    Nombre: string;
    Subtitulo?: string | null;
    Autores?: Author[];
    LibrosPrevios?: PreviousBook[];
    SagasPrevias?: PreviousSaga[];
}
export interface BookSimple extends CollectionWorkFields {
    Wiki?: string | null;
    Tipo?: 'libro' | 'antologia';
    PorcentajeCompletado?: number | null;
    /** El título divertido de la persona (`GET /coleccion/universos`); solo la frase, sin la cabecera. */
    TituloPropio?: string | null;
}

export interface DisplayChapter {
    type: 'chapter';
    data: Chapter;
}
export interface DisplayGroup {
    type: 'part' | 'interlude';
    name: string;
    data: DisplayItem[];
    id: number;
}
export type DisplayItem = DisplayChapter | DisplayGroup;
