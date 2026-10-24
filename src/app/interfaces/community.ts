// Lo que es de Libros en su Comunidad: los clubes de lectura. Las personas, las relaciones y el muro general se
// retiraron con la adhesión a Yosiftware (son de la plataforma).

export interface ClubSummary {
    Id: number;
    /** El espacio del club en la plataforma (entrar, pedir entrar, invitar y el canal). `null` en un club anterior. */
    EspacioId: number | null;
    Nombre: string;
    DescripcionMarkdown: string | null;
    Visibilidad: 'abierto' | 'cerrado';
    PropietarioId: number;
    Objetivo: { Tipo: 'libro' | 'saga' | 'universo' | 'antologia'; Id: number | null } | null;
    Miembros: number;
    FechaActualizacion: string;
}
/** Las solicitudes pendientes son de la plataforma: `EstadoMembresia` ya no vale `solicitud_pendiente`. */
export interface ClubDiscoveryItem extends ClubSummary { EstadoMembresia: 'disponible' | 'miembro'; }
export interface ClubDiscoveryCursor { cursorFecha: string; cursorId: number; }
export interface ClubDiscoveryPage { Clubes: ClubDiscoveryItem[]; SiguienteCursor: ClubDiscoveryCursor | null; }

export interface MyClubSummary extends ClubSummary {
    Rol: 'propietario' | 'moderador' | 'miembro';
    FechaIncorporacion: string;
    RetiradoDescubrimiento: boolean;
}
export interface ClubCompact { Id: number; Nombre: string; Visibilidad: 'abierto' | 'cerrado'; }
export interface ClubUpcomingEvent {
    Id: number;
    Club: ClubCompact;
    HitoId: number | null;
    Titulo: string;
    DescripcionMarkdown: string | null;
    FechaInicio: string;
    FechaFin: string | null;
    EnCurso: boolean;
    Destino: { Tipo: string; Id: number };
}
export interface ClubUpcomingEventCursor { cursorFechaInicio: string; cursorId: number; }
export interface ClubSocialSummary {
    TieneClubes: boolean;
    ClubesPropios: MyClubSummary[];
    ProximosEventos: ClubUpcomingEvent[];
    ClubesPublicosActivos: ClubPublicActivitySummary[];
}
export interface ClubPublicActivitySummary extends ClubSummary {
    Actividad30Dias: { Puntuacion: number; Total: number; Variedad: number };
    UltimaActividad: string;
}

export interface ClubMember {
    Id: number;
    Nombre: string;
    Imagen: string | null;
    Rol: 'propietario' | 'moderador' | 'miembro';
}

export type ClubAccessDirection = 'enviadas' | 'recibidas';
export interface ClubAccessDirectionCounters { EnviadasPendientes: number; RecibidasPendientes: number; }
/** Las pendientes del centro de acceso, compuestas con los espacios de la plataforma (`ClubAccessService`). */
export interface ClubAccessInboxCounters { Solicitudes: ClubAccessDirectionCounters; Invitaciones: ClubAccessDirectionCounters; }
export interface ClubAccessUser { Id: number; Nombre: string; Imagen: string | null; }

export interface ClubDetail {
    Id: number;
    EspacioId: number | null;
    /** La conversación del espacio en el chat de la plataforma; `null` hasta que la plataforma la da. */
    ConversacionId: number | null;
    Nombre: string;
    DescripcionMarkdown: string | null;
    Visibilidad: 'abierto' | 'cerrado';
    PropietarioId: number;
    MiembrosDetalle: ClubMember[];
    SiguienteCursorMiembros: { cursorId: number } | null;
    /** Los mensajes son del chat de la plataforma: ya no se cuentan aquí. */
    Metricas: { MiembrosActivos: number; Publicaciones: number };
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
export interface ClubDebate { Id: number; LecturaId: number | null; HitoId: number | null; Autor: ClubAccessUser; Titulo: string; ContenidoMarkdown: string | null; Spoiler: ClubSpoiler; FechaCreacion: string; }
export interface ClubDebateComment { Id: number; Autor: ClubAccessUser; ContenidoMarkdown: string | null; Spoiler: ClubSpoiler; FechaCreacion: string; }
export interface ClubDebateDetail { Debate: ClubDebate; Comentarios: ClubDebateComment[]; }
export interface ClubPollOption { Id: number; Texto: string; TotalVotos: number | null; }
export interface ClubPoll { Id: number; Pregunta: string; FechaCierre: string; Cerrada: boolean; MiVotoId: number | null; MiVotoVersion: number | null; Opciones: ClubPollOption[]; }

/** Una publicación del club (`GET /clubes-lectura/{id}/publicaciones`); se denuncia con la denuncia de Libros. */
export interface ClubPublication {
    Id: number;
    Titulo: string | null;
    /** `null` cuando el spoiler la oculta. */
    ContenidoMarkdown: string | null;
    Autor: ClubAccessUser;
    Spoiler: { Oculto?: boolean } | null;
    FechaCreacion: string;
    Comentarios: number;
    Reacciones: number;
}
export interface ClubPublicationCursor { cursorFecha: string; cursorId: number; }

export interface ClubCreateRequest {
    Nombre: string;
    DescripcionMarkdown?: string | null;
    Visibilidad: 'abierto' | 'cerrado';
}
