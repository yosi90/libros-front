import { Author } from "./author";
import { Chapter } from "./chapter";
import { Character } from "./character";
import { ReadStatus } from "./read-status";
import { Saga } from "./saga";
import { Universe } from "./universe";

export interface Book {
    Id: number;
    Nombre: string;
    cover: string;
    Estados: ReadStatus[];
    Autores: Author[];
    chapters: Chapter[];
    characters: Character[];
    universe: Universe;
    saga: Saga;
    Orden: number
}
export interface BookSimple {
    Id: number;
    Nombre: string;
    cover: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Portada: string;
}
