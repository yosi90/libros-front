export interface CommunityUser {
    Id: number;
    Nombre: string;
    Imagen: string | null;
    Username: string | null;
    DisplayName: string | null;
    Bio: string | null;
    PaisCodigo: string | null;
    PermitirMensajes: boolean;
}

export type CommunityRelationshipKind = 'seguidos' | 'seguidores' | 'amistades' | 'bloqueos';

export interface CommunityRelationship {
    Usuario: Pick<CommunityUser, 'Id' | 'Nombre' | 'Imagen'>;
    FechaCreacion: string;
}

export interface CommunityRelationshipPage {
    Relaciones: CommunityRelationship[];
    SiguienteAfterId: number | null;
}

export interface CommunityFriendRequest {
    Id: number;
    Estado: 'pendiente';
    Mensaje: string | null;
    FechaCreacion: string;
    Usuario: Pick<CommunityUser, 'Id' | 'Nombre' | 'Imagen'>;
}

export interface CommunityFriendRequestPage {
    Solicitudes: CommunityFriendRequest[];
    SiguienteAfterId: number | null;
}

export interface CommunityRelationshipStatus {
    UsuarioId: number;
    Siguiendo: boolean;
    MeSigue: boolean;
    Amistad: boolean;
    SolicitudPendiente: { Direccion: 'enviada' | 'recibida'; Estado: 'pendiente' } | null;
    PuedeInteractuar: boolean;
}

export interface CommunityPost {
    Id: number;
    Titulo: string | null;
    ContenidoMarkdown: string | null;
    Autor: Pick<CommunityUser, 'Id' | 'Nombre' | 'Imagen'>;
    ClubId: number | null;
    LibroId: number | null;
    AntologiaId: number | null;
    Audiencia: 'publico' | 'seguidores' | 'amigos' | 'club';
    FechaCreacion: string;
    Comentarios: number;
    Reacciones: number;
    Spoiler: CommunitySpoiler | null;
}

export interface CommunitySpoiler { Oculto: boolean; PaginaInicio?: number; PaginaFin?: number; CapituloInicioId?: number; CapituloFinId?: number; }
export interface CommunitySpoilerWrite { PaginaInicio?: number; PaginaFin?: number; CapituloInicioId?: number; CapituloFinId?: number; }

export interface CommunityCursor {
    FechaCreacion: string;
    Id: number;
}

export interface CommunityFeed {
    Publicaciones: CommunityPost[];
    SiguienteCursor: CommunityCursor | null;
}

export interface CommunityPostCreateRequest {
    Titulo?: string;
    ContenidoMarkdown: string;
    Audiencia: 'publico' | 'seguidores' | 'amigos' | 'club';
    ClubId?: number;
    LibroId?: number;
    AntologiaId?: number;
    Spoiler?: CommunitySpoilerWrite;
}

export interface CommunityComment {
    Id: number;
    ContenidoMarkdown: string | null;
    Autor: Pick<CommunityUser, 'Id' | 'Nombre' | 'Imagen'>;
    LibroId: number | null;
    AntologiaId: number | null;
    FechaCreacion: string;
    Spoiler: CommunitySpoiler | null;
}

export interface CommunityCommentPage {
    Comentarios: CommunityComment[];
    SiguienteCursor: CommunityCursor | null;
}

export interface ClubSummary {
    Id: number;
    Nombre: string;
    DescripcionMarkdown: string | null;
    Visibilidad: 'abierto' | 'cerrado';
    PropietarioId: number;
    Objetivo: { Tipo: 'libro' | 'saga' | 'universo' | 'antologia'; Id: number | null } | null;
    Miembros: number;
    FechaActualizacion: string;
}
export interface ClubDiscoveryItem extends ClubSummary { EstadoMembresia: 'disponible' | 'miembro' | 'solicitud_pendiente'; }
export interface ClubDiscoveryCursor { cursorFecha: string; cursorId: number; }
export interface ClubDiscoveryPage { Clubes: ClubDiscoveryItem[]; SiguienteCursor: ClubDiscoveryCursor | null; }

export interface ClubMember {
    Id: number;
    Nombre: string;
    Imagen: string | null;
    Rol: 'propietario' | 'moderador' | 'miembro';
}

export type ClubInboxState = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';
export interface ClubInboxCursor { cursorId: number; }
export interface ClubInvitation {
    Id: number;
    Club: { Id: number; Nombre: string; Visibilidad: 'abierto' | 'cerrado' };
    Invitador: { Id: number; Nombre: string; Imagen: string | null };
    Mensaje: null;
    Estado: ClubInboxState;
    FechaCreacion: string;
    FechaResolucion: string | null;
}
export interface ClubJoinRequest {
    Id: number;
    Solicitante: { Id: number; Nombre: string; Imagen: string | null };
    Mensaje: string | null;
    Estado: ClubInboxState;
    FechaCreacion: string;
    FechaResolucion: string | null;
}
export interface ClubInvitationPage { Invitaciones: ClubInvitation[]; SiguienteCursor: ClubInboxCursor | null; }
export interface ClubJoinRequestPage { Solicitudes: ClubJoinRequest[]; SiguienteCursor: ClubInboxCursor | null; }

export interface ClubDetail {
    Id: number;
    Nombre: string;
    DescripcionMarkdown: string | null;
    Visibilidad: 'abierto' | 'cerrado';
    PropietarioId: number;
    MiembrosDetalle: ClubMember[];
    SiguienteCursorMiembros: { cursorId: number } | null;
    Metricas: { MiembrosActivos: number; Publicaciones: number; Mensajes: number };
}

export interface ClubReading {
    Id: number;
    Objetivo: { Tipo: 'libro' | 'saga' | 'universo' | 'antologia'; Id: number | null };
    FechaInicio: string | null;
    FechaFin: string | null;
    ObjetivoTexto: string | null;
    Activa: boolean;
    FechaCierre: string | null;
}

export interface ClubProgress {
    LecturaId: number;
    PaginaActual: number | null;
    CapituloActual: string | null;
    Compartir: boolean;
    FechaActualizacion: string;
}

export interface ClubMilestone {
    Id: number;
    LecturaId: number | null;
    Tipo: 'pagina' | 'capitulo' | 'evento';
    ReferenciaInicio: number | null;
    ReferenciaFin: number | null;
    Titulo: string;
    ObjetivoTexto: string | null;
    FechaOrientativa: string | null;
}

export interface ClubMilestoneCreateRequest {
    Tipo: ClubMilestone['Tipo'];
    Titulo: string;
    LecturaId?: number;
    ReferenciaInicio?: number;
    ReferenciaFin?: number;
    ObjetivoTexto?: string;
    FechaOrientativa?: string;
}

export interface ClubCalendarEvent {
    Id: number;
    HitoId: number | null;
    Titulo: string;
    DescripcionMarkdown: string | null;
    FechaInicio: string;
    FechaFin: string | null;
}

export interface ClubCalendarEventCreateRequest {
    Titulo: string;
    FechaInicio: string;
    FechaFin?: string;
    DescripcionMarkdown?: string;
    HitoId?: number;
}

export interface ClubSpoiler { PaginaInicio?: number | null; PaginaFin?: number | null; CapituloInicioId?: number | null; CapituloFinId?: number | null; Oculto?: boolean; }
export interface ClubDebate { Id: number; LecturaId: number | null; HitoId: number | null; AutorId: number; Titulo: string; ContenidoMarkdown: string | null; Spoiler: ClubSpoiler; FechaCreacion: string; }
export interface ClubDebateComment { Id: number; AutorId: number; ContenidoMarkdown: string | null; Spoiler: ClubSpoiler; FechaCreacion: string; }
export interface ClubDebateDetail { Debate: ClubDebate; Comentarios: ClubDebateComment[]; }
export interface ClubPollOption { Id: number; Texto: string; TotalVotos: number | null; }
export interface ClubPoll { Id: number; Pregunta: string; FechaCierre: string; Cerrada: boolean; MiVotoId: number | null; Opciones: ClubPollOption[]; }

export interface ClubCreateRequest {
    Nombre: string;
    DescripcionMarkdown?: string | null;
    Visibilidad: 'abierto' | 'cerrado';
}
