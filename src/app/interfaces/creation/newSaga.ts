import { Antology } from "./../antology";
import { Author } from "./../author";
import { BookSimple } from "./../book";
import { Universe } from "./../universe";

export interface NewSaga {
    Id: number;
    Nombre: string;
    Autores: Author[];
    Universo: Universe;
    UserId: number;
}