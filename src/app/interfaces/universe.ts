import { Antology } from "./antology";
import { Author } from "./author";
import { BookSimple } from "./book";
import { Saga } from "./saga";

export interface Universe {
    Id: number,
    Nombre: string,
    Autores: Author[],
    Sagas: Saga[],
    Libros: BookSimple[],
    Antologias: Antology[],
}
