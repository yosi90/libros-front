export type NotificationCategory = 'amistades' | 'seguimiento' | 'feed' | 'chat' | 'clubes' | 'moderacion' | 'sistema';
export type NotificationContextType = 'none' | 'club' | 'relationships' | 'catalog_request' | 'review_report' | 'community_moderation' | 'moderation_appeal' | 'chat_conversation' | 'feed_publication' | 'user_profile';
export type NotificationOperationalDestination = 'propio' | 'cola_catalogo' | 'cola_reportes' | 'cola_denuncias_comunidad' | 'cola_alegaciones';

export interface AppNotification {
    Id: number;
    Codigo: string;
    Categoria: NotificationCategory;
    ContextoTipo: NotificationContextType;
    Titulo: string;
    Cuerpo: string | null;
    ConversationId?: number | null;
    MessageId?: number | null;
    Contexto: Record<string, string | number | boolean | null>;
    ActorId: number | null;
    FechaCreacion: string;
    FechaLectura: string | null;
}

export interface NotificationCursor {
    FechaCreacion: string;
    Id: number;
}

export interface NotificationList {
    Notificaciones: AppNotification[];
    NoLeidas: number;
    SiguienteCursor: NotificationCursor | null;
}

export interface NotificationPreference {
    Categoria: NotificationCategory;
    Canal: 'in_app' | 'push';
    Habilitado: boolean;
}
