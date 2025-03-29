import { Author } from "./author";
import { Chapter } from "./chapter";
import { Character } from "./character";
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
    Localizaciones: Location[];
    Conceptos: Concept[];
    Organizaciones: Organization[];
    Eventos: event[];
    Citas: Quote[];
    Universo: UniverseSimple;
    Saga: SagaSimple;
    Orden: number;
    Portada: string;
}
export interface BookSimple {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Portada: string;
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