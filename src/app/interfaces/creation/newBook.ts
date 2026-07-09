import { ReadStatus } from "../read-status";
import { Saga } from "../saga";
import { Author } from "./../author";
import { Universe } from "./../universe";

export interface NewBook {
    Id: number;
    Nombre: string;
    Autores: Author[];
    Universo: Universe;
    Saga: Saga;
    Orden: number;
    Estado?: ReadStatus;
    ISBN?: string | null;
    Sinopsis?: string | null;
    Paginas?: number | null;
    FechaPublicacion?: string | null;
    Estilos?: Array<number | { Id: number }>;
}
