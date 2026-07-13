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
    ContenidoMarkdown: string;
    Autor: Pick<CommunityUser, 'Id' | 'Nombre' | 'Imagen'>;
    ClubId: number | null;
    LibroId: number | null;
    AntologiaId: number | null;
    Audiencia: 'publico' | 'seguidores' | 'amigos' | 'club';
    FechaCreacion: string;
    Comentarios: number;
    Reacciones: number;
}

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
    Audiencia: 'publico' | 'seguidores' | 'amigos';
}

export interface CommunityComment {
    Id: number;
    ContenidoMarkdown: string;
    Autor: Pick<CommunityUser, 'Id' | 'Nombre' | 'Imagen'>;
    LibroId: number | null;
    AntologiaId: number | null;
    FechaCreacion: string;
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

export interface ClubMember {
    Id: number;
    Nombre: string;
    Imagen: string | null;
    Rol: 'propietario' | 'moderador' | 'miembro';
}

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

export interface ClubCreateRequest {
    Nombre: string;
    DescripcionMarkdown?: string | null;
    Visibilidad: 'abierto' | 'cerrado';
}
