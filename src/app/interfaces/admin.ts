import { Role } from './user';
import { ModerationIncident } from './moderation';

export interface AdminUser {
    Id: number;
    Nombre: string;
    Email: string;
    Username?: string | null;
    DisplayName?: string | null;
    Imagen?: string;
    Rol: Role;
    EstadoCuenta: Role;
    EmailVerificado: boolean;
    FechaRegistro: string;
    UltimoLogin?: string | null;
    UltimaActividad?: string | null;
    Moderacion?: Record<string, unknown>;
}

export interface AdminUsersCursor {
    cursorFecha: string;
    cursorId: number;
}

export interface AdminIncidentCursor {
    incidentCursorFecha: string;
    incidentCursorId: number;
}

export interface AdminUserDetailQuery {
    incidentLimit?: number;
    incidentCursorFecha?: string;
    incidentCursorId?: number;
}

export interface AdminUserDetailResponse<TUser extends AdminUser | ModerationUser = AdminUser | ModerationUser> {
    success: boolean;
    Usuario: TUser;
    Incidentes: ModerationIncident[];
    SiguienteCursorIncidentes: AdminIncidentCursor | null;
}

export interface AdminRole {
    Id: number;
    Nombre: string;
}

export interface AdminAuditQuery {
    modulo?: string;
    accion?: string;
    actorId?: number;
    usuarioObjetivoId?: number;
    desde?: string;
    hasta?: string;
    limit?: number;
    cursorFecha?: string;
    cursorId?: number;
}

export type AdminAuditRecord = Record<string, unknown>;

export interface AdminAuditResponse {
    success: boolean;
    Registros: AdminAuditRecord[];
    SiguienteCursor: AdminUsersCursor | null;
}

export interface AdminUserListResponse {
    success: boolean;
    Usuarios: AdminUser[];
    SiguienteCursor: AdminUsersCursor | null;
}

export interface ModerationUser {
    Id: number;
    Nombre: string;
    Username?: string | null;
    DisplayName?: string | null;
    Imagen?: string;
    Rol: Role;
    EstadoCuenta: Role;
    EmailVerificado: boolean;
    FechaRegistro: string;
    UltimoLogin?: string | null;
    UltimaActividad?: string | null;
    Moderacion?: Record<string, unknown>;
}

export interface ModerationUserListResponse {
    success: boolean;
    Usuarios: ModerationUser[];
    SiguienteCursor: AdminUsersCursor | null;
}

export interface AdminUsersQuery {
    q?: string;
    rolId?: number;
    estadoId?: number;
    emailVerificado?: boolean;
    limit?: number;
    cursorFecha?: string;
    cursorId?: number;
}

export interface AdminSummaryCount {
    Id: number;
    Nombre: string;
    Total: number;
}

export interface AdminSummary {
    Cuentas: {
        PorEstado: AdminSummaryCount[];
        PorRol: AdminSummaryCount[];
        EmailPendienteVerificacion: number;
    };
    Colas: {
        PeticionesCatalogo: number;
        ReportesResenas: number;
        DenunciasComunidad: number;
        Alegaciones: number;
    };
    Moderacion: { SancionesActivas: number };
    Operacion: {
        RealtimeDeadLetters: number;
        FirestoreDeadLetters: number;
    };
}
