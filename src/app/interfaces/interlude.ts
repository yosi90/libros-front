import { Chapter } from "./chapter";

export interface Interlude {
    Id: number;
    Nombre: string;
    Orden_cap: number | null;
    Orden_part: number | null;
    Pagigan: Number;
    Capitulos: Chapter[];
}