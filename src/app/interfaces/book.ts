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
import { ReadStatus } from "./read-status";
import { SagaSimple } from "./saga";
import { UniverseSimple } from "./universe";

export interface Book {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Capitulos: Chapter[];
    Partes: Part[];
    Interludios: Interlude[];
    Personajes: Character[];
    MetricasPersonajes?: CharacterBookMetrics;
    Localizaciones: Location[];
    Conceptos: Concept[];
    Organizaciones: Organization[];
    Eventos: event[];
    Citas: Quote[];
    Universo: UniverseSimple;
    Saga: SagaSimple;
    Orden: number;
    Portada: string;
    ISBN?: string | null;
    FechaPublicacion?: string | null;
    IdiomasDisponibles?: Array<{ Id: number; Codigo?: string | null; Nombre: string }> | string[] | null;
    Estilos?: Array<{ Id: number; Nombre: string }> | null;
    Estilo?: string | null;
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
}
export interface BookSimple {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Portada: string;
    Tipo?: 'libro' | 'antologia';
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
