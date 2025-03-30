import { Scene } from "./scene";

export interface Chapter {
    Id: number;
    Nombre: string;
    Orden: number;
    Pagina: number;
    Escenas: Scene[];
}
