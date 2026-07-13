import { NotificationContextType } from './notification';

export type ChatConversationType = 'directa' | 'club' | 'grupo' | 'sistema';
export type ChatParticipantRole = 'miembro' | 'admin';
export type ChatParticipantState = 'activo' | 'salio' | 'expulsado';
export type ChatReactionType = 'me_gusta' | 'risa' | 'sorpresa' | 'triste' | 'apoyo';

export interface ChatConversationLastMessage {
    Id: number;
    VistaPrevia: string;
    FechaEnvio: string;
    TipoRemitente: 'humano' | 'sistema';
}

export interface ChatConversation {
    Id: number;
    Tipo: ChatConversationType;
    Titulo: string | null;
    ClubId: number | null;
    FechaUltimoMensaje: string | null;
    NoLeidos: number;
    PuedeEnviar?: boolean;
    RolParticipante?: ChatParticipantRole;
    EstadoParticipante?: ChatParticipantState;
    EsSistema?: boolean;
    Contraparte?: { Id: number; Nombre: string; Imagen: string | null } | null;
    UltimoMensaje?: ChatConversationLastMessage | null;
}

export interface ChatParticipant {
    UsuarioId: number;
    Nombre: string;
    Imagen: string | null;
    Rol: ChatParticipantRole;
    Estado: ChatParticipantState;
    FechaUnion: string;
}

export interface ChatConversationDetail {
    Id: number;
    Tipo: ChatConversationType;
    Titulo: string | null;
    ClubId: number | null;
    CreadorId: number | null;
    EsSistema: boolean;
    PuedeEnviar: boolean;
    PuedeGestionarParticipantes: boolean;
    Participantes: ChatParticipant[];
}

export interface ChatMessageReactions {
    PorTipo: Record<ChatReactionType, number>;
    MiReaccion: ChatReactionType | null;
}

export interface ChatMessagePermissions {
    PuedeResponder: boolean;
    PuedeReaccionar: boolean;
    PuedeEditar: boolean;
    PuedeBorrar: boolean;
    PuedeDenunciar: boolean;
}

export interface SystemMessageAction {
    ContextoTipo: NotificationContextType;
    Contexto: Record<string, string | number | boolean | null>;
}

export interface ChatMessage {
    Id: number;
    RemitenteId: number | null;
    TipoRemitente: 'humano' | 'sistema';
    Remitente?: { Id: number; Nombre: string; Imagen: string | null } | null;
    CuerpoMarkdown: string;
    FechaEnvio: string;
    FechaEdicion: string | null;
    Eliminado: boolean;
    CodigoSistema: string | null;
    SeveridadSistema: 'info' | 'aviso' | 'importante' | 'critico' | null;
    Accion: SystemMessageAction | null;
    NotificacionId: number | null;
    Reacciones: ChatMessageReactions;
    Permisos: ChatMessagePermissions;
    MensajeRespondido: ChatReplySummary | null;
}

export type ChatMessageCreateResult = Pick<ChatMessage, 'Id' | 'RemitenteId' | 'CuerpoMarkdown' | 'FechaEnvio' | 'MensajeRespondido'> & { ConversacionId: number };

export interface ChatReplySummary {
    Id: number;
    RemitenteId: number;
    CuerpoMarkdown: string;
    Eliminado: boolean;
    FechaEnvio: string | null;
}

export interface DirectEligibility {
    UsuarioId: number;
    PuedeIniciarDirecto: boolean;
    Motivo: 'friendship' | 'following' | 'follow_required' | 'messages_disabled' | 'blocked_or_unavailable' | 'same_user';
}

export interface ChatMessagePage {
    Mensajes: ChatMessage[];
    SiguienteBeforeId: number | null;
}

export interface SocialSummary {
    Parcial: boolean;
    BloquesFallidos: string[];
    Resumen: {
        Relaciones: { Amistades: number; SolicitudesRecibidasPendientes: number; Seguidores: number; Seguidos: number };
        Clubes: { Activos: number; InvitacionesPendientes: number };
        Mensajes: { NoLeidos: number; NoLeidosHumanos: number; NoLeidosSistema: number };
    };
}

export interface ChatGroupCandidate {
    UsuarioId: number;
    Nombre: string;
    Imagen: string | null;
}

export interface ChatFloatPosition { x?: number; y?: number }
export interface ChatFloatSize { ancho?: number; alto?: number }
export type ChatFloatMode = 'normal' | 'minimizado';

export interface ChatFloatWindow {
    ConversacionId: number;
    Modo: ChatFloatMode;
    Posicion?: ChatFloatPosition | null;
    Tamano?: ChatFloatSize | null;
}

export interface ChatFloatingPreferences {
    VersionShape: 1;
    Version: number;
    FechaActualizacion: string | null;
    AutoabrirListado: boolean;
    PermitirBurbujas: boolean;
    ModoListado: ChatFloatMode;
    PosicionListado: ChatFloatPosition | null;
    TamanoListado: ChatFloatSize | null;
    ConversacionesFlotantes: ChatFloatWindow[];
}

export type ChatFloatingPreferencesPatch = Partial<Pick<ChatFloatingPreferences, 'AutoabrirListado' | 'PermitirBurbujas' | 'ModoListado' | 'PosicionListado' | 'TamanoListado' | 'ConversacionesFlotantes'>> & { Version: number };
