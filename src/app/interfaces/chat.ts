// El chat que pinta Libros. Las conversaciones, los mensajes y el tiempo real son los de la plataforma Yosiftware
// (ecosistema-kit/CHAT.md, «Tu propio frontend»); `shared/platform-chat.ts` traduce su contrato a este modelo, que
// conserva la forma de las vistas de siempre (Web, Wood y Mobile).

/** `web`: la conversación de una comunidad de una web (un club de Libros, una campaña de Rol). */
export type ChatConversationType = 'directa' | 'grupo' | 'web';
export type ChatParticipantRole = 'miembro' | 'admin';
/** Las cinco reacciones de siempre de Libros, con su emoji en la plataforma (`CHAT_REACTION_EMOJIS`). */
export type ChatReactionType = 'me_gusta' | 'risa' | 'sorpresa' | 'triste' | 'apoyo';

/** Una persona del chat. `Id` es el de su cuenta de Yosiftware. */
export interface ChatPerson {
    Id: string;
    Alias: string;
    Nombre: string;
    Imagen: string | null;
    /** Cuenta borrada: «Cuenta borrada», sin perfil ni avatar (no se enlaza). */
    Borrada: boolean;
}

export interface ChatConversationLastMessage {
    Id: number;
    VistaPrevia: string;
    FechaEnvio: string;
    Susurro: boolean;
}

export interface ChatConversationPermissions {
    Escribir: boolean;
    Invitar: boolean;
    Administrar: boolean;
    Salir: boolean;
}

export interface ChatConversation {
    Id: number;
    Tipo: ChatConversationType;
    Titulo: string | null;
    /** La web de una conversación de comunidad. */
    Web: { Clave: string; Nombre: string } | null;
    FechaUltimoMensaje: string | null;
    NoLeidos: number;
    PuedeEnviar: boolean;
    RolParticipante: ChatParticipantRole;
    Cerrada: boolean;
    Miembros: number;
    /** En las directas, la otra persona. */
    Contraparte: ChatPerson | null;
    UltimoMensaje: ChatConversationLastMessage | null;
    Permisos: ChatConversationPermissions;
}

export interface ChatParticipant {
    UsuarioId: string;
    Nombre: string;
    Imagen: string | null;
    Rol: ChatParticipantRole;
    Borrada: boolean;
}

export interface ChatPendingInvitation {
    Id: number;
    Nombre: string;
}

export interface ChatConversationDetail {
    Id: number;
    Tipo: ChatConversationType;
    /** El título que se enseña: el del grupo, el de la comunidad o el nombre de la otra persona. */
    Titulo: string;
    Web: { Clave: string; Nombre: string } | null;
    Contraparte: ChatPerson | null;
    PuedeEnviar: boolean;
    PuedeGestionarParticipantes: boolean;
    Cerrada: boolean;
    Participantes: ChatParticipant[];
    Invitaciones: ChatPendingInvitation[];
}

export interface ChatOtherReaction {
    Emoji: string;
    Total: number;
}

export interface ChatMessageReactions {
    PorTipo: Record<ChatReactionType, number>;
    MiReaccion: ChatReactionType | null;
    /** Las de otros emojis (las elegidas desde otra web): se enseñan tal cual. */
    Otras: ChatOtherReaction[];
    /** La reacción propia si no es una de las cinco de Libros. */
    MiEmoji: string | null;
}

export interface ChatMessagePermissions {
    PuedeResponder: boolean;
    PuedeReaccionar: boolean;
    PuedeEditar: boolean;
    PuedeBorrar: boolean;
    PuedeDenunciar: boolean;
}

export interface ChatReplySummary {
    Id: number;
    RemitenteId: string | null;
    Texto: string;
    Eliminado: boolean;
}

export interface ChatMessage {
    Id: number;
    /** `sistema`: los avisos del propio chat («Ana ha entrado en el grupo»). */
    TipoRemitente: 'humano' | 'sistema';
    RemitenteId: string | null;
    Remitente: ChatPerson | null;
    Propio: boolean;
    /** Texto plano (la plataforma no admite Markdown). */
    Texto: string;
    FechaEnvio: string;
    FechaEdicion: string | null;
    Eliminado: boolean;
    /** De alguien con quien hay un bloqueo: «Mensaje no disponible». */
    NoDisponible: boolean;
    /** No avisó por push (CHAT.md, «Los susurros»). */
    Susurro: boolean;
    IdCliente: string | null;
    Reacciones: ChatMessageReactions;
    Permisos: ChatMessagePermissions;
    MensajeRespondido: ChatReplySummary | null;
}

export interface ChatMessagePage {
    Mensajes: ChatMessage[];
    /** Para pedir los anteriores (`antes`); `null` si no hay más. */
    SiguienteCursor: number | string | null;
}

/** Una amistad con la que abrir una directa o a la que invitar a un grupo. */
export interface ChatFriendship {
    Usuario: ChatPerson;
}

export interface ChatGroupCandidate {
    UsuarioId: string;
    Nombre: string;
    Imagen: string | null;
    EsAmistad: boolean;
}

export interface SocialSummary {
    Parcial: boolean;
    BloquesFallidos: string[];
    Resumen: {
        /** Solo los clubes activos: las invitaciones pendientes las cuenta la plataforma (`GET /v1/espacios/invitaciones`). */
        Clubes: { Activos: number };
    };
}

// Las ventanas flotantes del chat: cómo las deja cada persona, en el bloque de ajustes de Libros de su cuenta
// (`yosiftware.ajustes`, clave `chatFlotante`; ACCESO.md, «Los ajustes de la web»).
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
    /** La versión del bloque de ajustes en que se leyeron. */
    Version: number;
    FechaActualizacion: string | null;
    AutoabrirListado: boolean;
    PermitirBurbujas: boolean;
    ModoListado: ChatFloatMode;
    PosicionListado: ChatFloatPosition | null;
    TamanoListado: ChatFloatSize | null;
    ConversacionesFlotantes: ChatFloatWindow[];
}

export type ChatFloatingPreferencesPatch = Partial<Pick<ChatFloatingPreferences, 'AutoabrirListado' | 'PermitirBurbujas' | 'ModoListado' | 'PosicionListado' | 'TamanoListado' | 'ConversacionesFlotantes'>>;
