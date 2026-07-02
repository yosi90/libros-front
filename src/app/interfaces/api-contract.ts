export type OriginContext = 'actual' | 'libro_previo' | 'saga_previa' | 'saga_base';

export interface ContextOrigin {
    OrigenContexto?: OriginContext;
    EsLibroActual?: boolean;
    EsSagaPrevia?: boolean;
    EsSeccionOrigen?: boolean;
    OrdenOrigen?: number | null;
    Id_Saga_Origen?: number | null;
}

export interface NarrativeEntryCreate {
    Nombre: string;
    Descripcion: string;
}

export interface NarrativeEntry extends NarrativeEntryCreate {
    Id: number;
    Origen?: number | null;
    Orden?: number | null;
}

export interface NarrativeEntityCreate {
    LibroId: number;
    Nombre: string;
    Entradas: NarrativeEntryCreate[];
}

export interface NarrativeEntityUpdate {
    LibroId: number;
    Nombre: string;
}

export interface CharacterCreate {
    LibroId: number;
    Apodo: string;
    Sexo: boolean | number;
    Entradas: NarrativeEntryCreate[];
}

export interface CharacterBookAliasWrite {
    LibroId: number;
    Apodo: string;
}

export interface CharacterAliasUpdate {
    Apodo: string;
}

export interface CharacterRootUpdate {
    Sexo: number;
}

export interface CharacterStateWrite {
    LibroId: number;
    EstadoId: number;
}

export interface CharacterStateUpdate {
    EstadoId: number;
}

export interface CharacterRelationWrite {
    LibroId: number;
    PersonajeRelacionadoId: number;
    Parentesco: string;
    Reflejada?: boolean;
}

export interface CharacterRelationUpdate {
    LibroId?: number;
    PersonajeRelacionadoId?: number;
    Parentesco?: string;
    Reflejada?: boolean;
}

export interface SceneCharacterWrite {
    Id: number;
    Nombrado?: boolean;
}

export interface SceneWrite {
    Nombre: string;
    Descripcion: string;
    Id_Localizacion: number;
    Personajes: SceneCharacterWrite[];
}

export interface ChapterWrite {
    Nombre: string;
    Pagina: number;
    PaginaFinal?: number;
    Orden: number;
}

export interface InterludeChapterWrite {
    Nombre: string;
    Pagina: number;
    PaginaFinal?: number;
    Orden: number;
}

export interface PartWrite {
    Nombre: string;
    OrdenInicio: number;
    OrdenFinal: number;
    Pagina: number;
}

export interface InterludeWrite {
    Nombre: string;
    Pagina: number;
    OrdenCapituloPredecesor?: number | null;
    IdPartePredecesor?: number | null;
}

export interface OrganizationCharacterRelationWrite {
    LibroId: number;
    PersonajeId: number;
    Descripcion: string;
}

export interface OrganizationLocationRelationWrite {
    LibroId: number;
    LocalizacionId: number;
    Descripcion: string;
}

export interface OrganizationRelationUpdate {
    LibroId: number;
    Descripcion: string;
}

export interface LocationCreate extends NarrativeEntityCreate {
    EstadoId?: number;
}

export interface LocationUpdate extends NarrativeEntityUpdate {
    EstadoId?: number;
}

export interface ConceptCreate extends NarrativeEntityCreate {}

export interface ConceptUpdate extends NarrativeEntityUpdate {}

export interface OrganizationCreate extends NarrativeEntityCreate {}

export interface OrganizationUpdate extends NarrativeEntityUpdate {}

export interface EventCreate extends NarrativeEntityCreate {
    Id_Localizacion: number;
    Personajes?: Array<number | { Id: number }>;
}

export interface EventUpdate extends NarrativeEntityUpdate {
    Id_Localizacion: number;
    Personajes?: Array<number | { Id: number }>;
}

export interface QuoteCreate extends NarrativeEntityCreate {
    Pagina: number;
    PersonajeId: number;
}

export interface QuoteUpdate extends NarrativeEntityUpdate {
    Pagina: number;
    PersonajeId: number;
}

export interface EntityWriteResponse {
    success?: boolean;
    message?: string;
}
