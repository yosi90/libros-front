import { ContextOrigin } from "./api-contract";
import { CharacterSimple } from "./character";
import { Entry } from "./entry";

export interface event extends ContextOrigin {
    Id: number;
    Nombre: string;
    Id_Localizacion?: number;
    Personajes: CharacterSimple[] | number[];
    Entradas: Entry[];
}
