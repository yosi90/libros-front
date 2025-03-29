import { Antology } from "./antology";
import { Author } from "./author";
import { BookSimple } from "./book";

export interface Saga {
    Id: number;
    Nombre: string;
    Autores: Author[];
    Libros: BookSimple[];
    Antologias: Antology[];
}
export interface SagaSimple {
    Id: number;
    Nombre: string;
}