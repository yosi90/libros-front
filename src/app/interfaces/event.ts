import { CharacterSimple } from "./character";
import { Entry } from "./entry";

export interface event {
    Id: number;
    Nombre: string;
    Personajes: CharacterSimple[];
    Entradas: Entry[];
}