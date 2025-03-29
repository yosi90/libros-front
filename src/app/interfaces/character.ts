import { Entry } from "./entry";

export interface Character {
    Id: number;
    Nombre: string;
    Sexo: boolean;
    Entradas: Entry[];
    Apodos: string[];
    Estados: CharacterStatus[];
    Relaciones: CharacterRelation[];
}
export interface CharacterSimple {
    Id: number;
    Nombre: string;
    Sexo: boolean;
}
export interface CharacterStatus {
    Id: number;
    Estado: {
        Id: number;
        Nombre: string;
    };
    Origen: number;
    Orden: number;
}
export interface CharacterRelation {
    Id: number;
    Relativo: CharacterSimple;
    Parentesco: string;
    Origen: number;
    Orden: number;
    Reflejada: boolean;
}