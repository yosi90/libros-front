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
    Id: number;
    Relativo?: CharacterSimple;
    PersonajeRelacionadoId?: number;
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
