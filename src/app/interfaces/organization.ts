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
    /** Nombre del personaje resuelto por la API en el libro consultado. */
    Nombre?: string;
    Descripcion: string;
    Origen: number;
    Orden: number | null;
}

export interface OrganizationLocationRelation {
    OrganizacionId: number;
    LocalizacionId: number;
    Localizacion?: Location;
    LocalizacionNombre?: string;
    Nombre?: string;
    Descripcion: string;
    Origen: number;
    Orden: number | null;
}
