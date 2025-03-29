import { CharacterSimple } from "./character";
import { Entry } from "./entry";

export interface Quote {
    Id: number;
    Nombre: string;
    Pagina: number;
    Personaje: CharacterSimple;
    Entradas: Entry[];
}