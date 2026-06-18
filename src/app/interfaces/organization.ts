import { ContextOrigin } from "./api-contract";
import { CharacterSimple } from "./character";
import { Entry } from "./entry";
import { Location } from "./location";

export interface Organization extends ContextOrigin {
    Id: number;
    Nombre: string;
    Entradas: Entry[];
    Localizaciones: Location[] | number[];
    Personajes: CharacterSimple[] | number[];
}

export interface OrganizationCharacterRelation {
    OrganizacionId: number;
    PersonajeId: number;
    Descripcion: string;
    Origen: number;
    Orden: number | null;
}

export interface OrganizationLocationRelation {
    OrganizacionId: number;
    LocalizacionId: number;
    Descripcion: string;
    Origen: number;
    Orden: number | null;
}
