import { CharacterSimple } from "./character";
import { Entry } from "./entry";
import { Location } from "./location";

export interface Scene {
    Id: number;
    Nombre: string;
    Descripcion: string;
    Localizacion: Location;
    Personajes: number[];
    Valida: boolean;
    Eliminable: boolean;
}