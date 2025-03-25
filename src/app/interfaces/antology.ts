import { Author } from "./author";
import { BookSimple } from "./book";
import { ReadStatus } from "./read-status";

export interface Antology {
    Id: number,
    Nombre: string,
    Autores: Author[],
    Estados: ReadStatus[],
    Libros?: BookSimple[],
}
