import { ReadStatus } from "../read-status";
import { Saga } from "../saga";
import { Author } from "./../author";
import { Universe } from "./../universe";

export interface NewBook {
    Nombre: string;
    Autores: Author[];
    Universo: Universe;
    Saga: Saga;
    Orden: number;
    Estado: ReadStatus;
    userId: number;
}