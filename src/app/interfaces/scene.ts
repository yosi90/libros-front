import { Character, CharacterBookMetrics } from "./character";
import { Entry } from "./entry";
import { Location } from "./location";

export interface Scene {
    Id: number;
    Nombre: string;
    Descripcion: string;
    Localizacion: Location;
    Personajes: number[] | SceneCharacterDetail[];
    PersonajesDetalle?: SceneCharacterDetail[];
    Valida: boolean;
    Eliminable: boolean;
}

export interface SceneCharacterDetail {
    Id: number;
    Nombrado: boolean;
}

export interface SceneWriteResponse {
    Escena: Scene;
    PersonajesOrdenados: Character[];
    MetricasPersonajes: CharacterBookMetrics;
    OrdenPersonajesCambiado: boolean;
}
