import { Scene } from "./scene";

export interface Chapter {
    Id: number;
    Nombre: string;
    Orden: number;
    Pagina: number;
    PaginaFinal?: number;
    EsInterludio?: boolean;
    Id_Interludio?: number;
    Escenas: Scene[];
}
