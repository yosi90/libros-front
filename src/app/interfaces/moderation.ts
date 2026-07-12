export type ModerationPolicyKind = 'uso' | 'creacion';
export type ModerationScope = 'cuenta' | 'creacion' | 'comunidad' | 'publicacion' | 'chat' | 'clubes';
export type ModerationAppealStatus = 'pendiente' | 'en_revision' | 'aceptada' | 'rechazada';
export type ModerationSanctionStatus = 'banned' | 'blocked' | 'sanctioned' | 'revoked';
export type ModerationIncidentMode = 'report' | 'force_sanction';

export interface ModerationStage {
    Id: number;
    IndiceEtapa: number;
    UmbralReportes: number;
    DuracionMinutos: number | null;
    EsPermanente: boolean;
}

export interface ModerationStageWrite {
    IndiceEtapa: number;
    UmbralReportes: number;
    DuracionMinutos?: number | null;
    EsPermanente?: boolean;
}

export interface ModerationCase {
    Id: number;
    Codigo: string;
    Nombre: string;
    Descripcion: string | null;
    ModoFuente: 'manual_only' | 'technical_signal_auto';
    TipoOrigen: 'admin_custom' | 'system_seed';
    Habilitado: boolean;
    Borrado: boolean;
    Etapas: ModerationStage[];
    Alcances: ModerationScope[];
}

export interface ModerationCaseWrite {
    Codigo: string;
    Nombre: string;
    Descripcion?: string | null;
    ModoFuente?: 'manual_only' | 'technical_signal_auto';
    Habilitado?: boolean;
    Etapas: ModerationStageWrite[];
    Alcances?: ModerationScope[];
}

export interface ModerationCasePatch {
    Nombre?: string;
    Descripcion?: string | null;
    ModoFuente?: 'manual_only' | 'technical_signal_auto';
    Habilitado?: boolean;
    Alcances?: ModerationScope[];
}

export interface ModerationIncidentSanction {
    Id: number;
    Caso?: string;
    Estado: ModerationSanctionStatus | 'none';
    EsPermanente?: boolean;
    FechaFin?: string | null;
}

export interface ModerationIncident {
    Id: number;
    Caso: { Codigo: string; Nombre: string };
    Fuente: 'manual_admin' | 'technical_signal';
    Modo: ModerationIncidentMode;
    MensajeVisible?: string | null;
    FechaConfirmacion: string;
    Sancion: ModerationIncidentSanction;
    DescripcionInterna?: string | null;
    Contexto?: Record<string, JsonValue>;
    SnapshotAntes?: Record<string, JsonValue>;
    SnapshotDespues?: Record<string, JsonValue>;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface ModerationIncidentWrite {
    UsuarioId: number;
    CodigoCaso: string;
    Modo?: ModerationIncidentMode;
    DescripcionInterna?: string | null;
    MensajeVisible?: string | null;
    Contexto?: Record<string, JsonValue>;
    DedupKey?: string | null;
    SanctionOverride?: { isPermanent: true } | { endsAtUtc: string };
    AlcancesOverride?: ModerationScope[];
}

export interface ModerationSanction {
    Id: number;
    Usuario: { Id: number; Nombre: string };
    Caso: string;
    Etapa: number;
    Estado: ModerationSanctionStatus;
    MensajeVisible: string | null;
    FechaInicio: string | null;
    FechaFin: string | null;
    EsPermanente: boolean;
    FechaRevocacion: string | null;
    MotivoRevocacion: string | null;
}

export interface ModerationPolicy {
    Tipo: ModerationPolicyKind;
    Version: number;
    Titulo: string;
    Markdown: string;
    FechaPublicacion: string;
    Aceptada: boolean;
}

export interface ModerationPolicyDraft {
    Tipo: ModerationPolicyKind;
    Titulo: string | null;
    Markdown: string | null;
    VersionActivaId: number | null;
}

export interface ModerationPolicyDraftWrite {
    Titulo: string;
    Markdown: string;
}

export interface ModerationAppeal {
    Id: number;
    SancionId: number;
    Estado: ModerationAppealStatus;
    Texto: string;
    Caso: string;
    FechaCreacion: string;
    FechaActualizacion: string;
    FechaResolucion: string | null;
}

export interface ModerationAdminAppeal extends ModerationAppeal {
    UsuarioId: number;
    NotaInterna: string | null;
}

export interface OffsetPage<T> {
    success: boolean;
    limit: number;
    offset: number;
    items: T[];
}
