import { Antology } from "./antology";
import { Author } from "./author";
import { Book, BookSimple } from "./book";
import { Universe } from "./universe";

export interface Saga {
    Id: number,
    Nombre: string,
    Autores: Author[],
    Libros: BookSimple[],
    Antologias: Antology[],
}
