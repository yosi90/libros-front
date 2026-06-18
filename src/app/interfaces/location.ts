import { ContextOrigin } from "./api-contract";
import { Entry } from "./entry";

export interface Location extends ContextOrigin {
    Id: number;
    Nombre: string;
    Estados?: LocationStatus[];
    Id_Estado?: number | null;
    Estado?: string;
    Entradas: Entry[];
}
export interface LocationStatus {
    Id: number;
    Nombre: string;
}
