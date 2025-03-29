import { CharacterSimple } from "./character";
import { Entry } from "./entry";
import { Location } from "./location";

export interface Organization {
    Id: number;
    Nombre: string;
    Entradas: Entry[];
    Localizaciones: Location[];
    Personajes: CharacterSimple[];
}