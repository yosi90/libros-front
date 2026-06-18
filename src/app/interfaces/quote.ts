import { ContextOrigin } from "./api-contract";
import { CharacterSimple } from "./character";
import { Entry } from "./entry";

export interface Quote extends ContextOrigin {
    Id: number;
    Nombre: string;
    Pagina: number;
    Personaje?: CharacterSimple;
    Id_Personaje?: number;
    Entradas: Entry[];
}
