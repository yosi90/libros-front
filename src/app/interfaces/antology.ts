import { Author } from "./author";
import { BookSimple } from "./book";
import { ReadStatus } from "./read-status";

export interface Antology {
    Id: number;
    Nombre: string;
    Estados: ReadStatus[];
    Autores: Author[];
    Orden: number;
    Secciones?: BookSimple[];
    Portada: string;
}