import { Entry } from "./entry";

export interface Location {
    Id: number;
    Nombre: string;
    Estados: LocationStatus[];
    Entradas: Entry[];
}
export interface LocationStatus {
    Id: number;
    Nombre: string;
}