export interface ChatConversation {
    Id: number;
    Tipo: 'directa' | 'club';
    Titulo: string | null;
    ClubId: number | null;
    FechaUltimoMensaje: string | null;
    NoLeidos: number;
}

export interface ChatMessage {
    Id: number;
    RemitenteId: number;
    Remitente: { Id: number; Nombre: string; Imagen: string | null } | null;
    CuerpoMarkdown: string;
    FechaEnvio: string;
    FechaEdicion: string | null;
    Eliminado: boolean;
    MensajeRespondido: ChatReplySummary | null;
}

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
