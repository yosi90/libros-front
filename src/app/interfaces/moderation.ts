export type ModerationPolicyKind = 'uso' | 'creacion';
export type ModerationScope = 'cuenta' | 'creacion' | 'comunidad' | 'publicacion' | 'chat' | 'clubes';

export interface ModerationAccessRestriction {
    Alcance: ModerationScope;
    Activa: boolean;
    MotivoVisible: string | null;
    FechaInicio: string | null;
    FechaFin: string | null;
    EsPermanente: boolean;
    SancionId: number | null;
    IncidenteId: number | null;
}

export interface ModerationAccessSanction {
    SancionId: number;
    IncidenteId: number;
    Caso: string;
    MensajeVisible: string | null;
    FechaInicio: string;
    FechaFin: string | null;
    EsPermanente: boolean;
    Alcances: ModerationScope[];
}

export interface ModerationAccessPolicy {
    Tipo: ModerationPolicyKind;
    VersionId: number | null;
    Pendiente: boolean;
}

export interface ModerationAccessStatus {
    AlcancesActivos: ModerationScope[];
    Restricciones: ModerationAccessRestriction[];
    Sanciones: ModerationAccessSanction[];
    Politicas: ModerationAccessPolicy[];
    RequiereLimpiarRealtime: boolean;
    AlcancesQueRevocanRealtime: Extract<ModerationScope, 'cuenta' | 'comunidad' | 'chat'>[];
}
