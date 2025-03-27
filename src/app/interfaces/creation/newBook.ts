import { ReadStatus } from "../read-status";
import { Saga } from "../saga";
import { Author } from "./../author";
import { Universe } from "./../universe";

export interface NewBook {
    Id: number;
    Nombre: string;
    Autores: Author[];
    Universo: Universe;
    Saga: Saga;
    Orden: number;
    Estado: ReadStatus;
    UserId: number;
}