import { Antology } from "./../antology";
import { Author } from "./../author";
import { BookSimple } from "./../book";
import { Universe } from "./../universe";

export interface NewSaga {
    Id: number;
    Nombre: string;
    Subtitulo?: string | null;
    Autores: Author[];
    Universo: Universe;
    /** Sagas anteriores directas. Ausente: en una edición se conservan las actuales. */
    SagasPreviasIds?: number[];
}
