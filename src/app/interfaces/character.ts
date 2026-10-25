import { Entry } from "./entry";
import { ContextOrigin } from "./api-contract";

export interface Character extends ContextOrigin {
    Id: number;
    Nombre: string;
    Sexo: boolean | number | null;
    Apariciones?: number;
    Nombramientos?: number;
    Grupo?: 'Principales' | 'Recurrentes' | 'Secundarios' | 'Desaparecidos' | 'Muertos' | 'Antiguos';
    OrdenGrupo?: number;
    MediaApariciones?: number;
    MedianaApariciones?: number;
    MediaNombramientos?: number;
    TextoApariciones?: string;
    CapitulosAparicionResumen?: CharacterAppearanceSummary;
    Capitulos?: CharacterChapterLink[];
    CapitulosNombrado?: CharacterChapterLink[];
    CapitulosInterludios?: CharacterInterludeChapterLink[];
    CapitulosInterludiosNombrado?: CharacterInterludeChapterLink[];
    Organizaciones?: CharacterRelatedEntity[];
    Eventos?: CharacterRelatedEntity[];
    Citas?: CharacterRelatedEntity[];
    Entradas: Entry[];
    Apodos: CharacterAlias[];
    Estados: CharacterStatus[];
    Relaciones: CharacterRelation[];
}
export interface CharacterSimple {
    Id: number;
    Nombre: string;
    Sexo?: boolean | number | null;
}

export interface CharacterOrderSummary {
    Id: number;
    Nombre: string;
    Grupo?: Character['Grupo'];
    OrdenGrupo?: number | null;
}
export interface CharacterStatus {
    Id: number;
    Estado: {
        Id: number;
        Nombre: string;
    };
    Origen: number;
    Orden: number | null;
}
export interface CharacterRelation {
    /** En la API es el id del personaje relacionado (como `PersonajeRelacionadoId`), no el de la relación. */
    Id: number;
    /** El id de la fila de relación: el que piden `PUT` y `DELETE personajes/{id}/relaciones/{idRelacion}`. */
    RelacionId?: number;
    Relativo?: CharacterSimple;
    PersonajeRelacionadoId?: number;
    /** Nombre del personaje relacionado resuelto por la API en el libro consultado. */
    Nombre?: string;
    Parentesco: string;
    Origen: number;
    Orden: number | null;
    Reflejada: boolean;
}

export interface CharacterAlias {
    Id: number;
    ApodoId: number;
    Apodo: string;
    Origen?: number | null;
    Orden?: number | null;
    Borrado?: boolean;
}

export interface CharacterBookMetrics {
    MediaApariciones: number;
    MedianaApariciones: number;
    MediaNombramientos: number;
    TotalCapitulosMetricas: number;
}

export interface CharacterAppearanceSummary {
    Capitulos?: Array<number | null>;
    CapitulosTexto?: string;
    Interludios?: string[];
    CapitulosInterludio?: string[];
}

export interface CharacterChapterLink {
    Id: number | null;
    Nombre?: string;
    Orden?: number | null;
    Nombrado?: boolean;
}

export interface CharacterInterludeChapterLink extends CharacterChapterLink {
    Id_Interludio?: number;
    Interludio?: string;
}

export interface CharacterRelatedEntity {
    Id: number;
    Nombre: string;
    Descripcion?: string;
    Origen?: number;
}
