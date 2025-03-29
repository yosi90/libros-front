import { Entry } from "./entry";

export interface Concept {
    Id: number;
    Nombre: string;
    Entradas: Entry[];
}