import { ContextOrigin } from "./api-contract";
import { Entry } from "./entry";

export interface Concept extends ContextOrigin {
    Id: number;
    Nombre: string;
    Entradas: Entry[];
}
