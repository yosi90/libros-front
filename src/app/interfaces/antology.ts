import { Author } from "./author";
import { BookSimple } from "./book";
import { BookStatus } from "./book-status";

export interface Antology {
    Id: number,
    Nombre: string,
    Autores: Author[],
    Estados: BookStatus[],
    Libros?: BookSimple[],
}
