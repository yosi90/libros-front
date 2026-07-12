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
