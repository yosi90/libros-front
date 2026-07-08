import { Author } from './author';
import { Antology } from './antology';
import { BookSimple } from './book';
import { ReadingState, ReadingStatusId } from './read-status';

export type CatalogEntityType = 'autor' | 'universo' | 'saga' | 'libro' | 'antologia';
export type CatalogRequestAction = 'alta' | 'edicion';
export type CatalogRequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'devuelta';
export type CatalogRequestStatusFilter = CatalogRequestStatus | 'todas';
export type CatalogItemType = 'libro' | 'antologia';

export interface CatalogOption {
    Id: number;
    Nombre: string;
    Codigo?: string | null;
}

export interface OriginPlacesPage {
    Items: CatalogOption[];
    Page: number;
    PageSize: number;
    Total: number;
    HasMore: boolean;
}

export interface CatalogQuery {
    q?: string;
    autorId?: number;
    universoId?: number;
    sagaId?: number;
    idiomaId?: number;
    estiloId?: number;
    estadoId?: ReadingStatusId;
    puntuacionMin?: number;
}

export interface CatalogItem {
    Tipo: CatalogItemType;
    Id: number;
    Nombre: string;
    Portada: string | null;
    ISBN?: string | null;
    FechaPublicacion?: string | null;
    Autores: Author[];
    Estados: ReadingState[];
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
    IdiomasDisponibles?: CatalogOption[] | null;
    Estilos?: CatalogOption[] | null;
    Estilo?: string | null;
}

export interface CatalogStateDistributionItem {
    EstadoId: ReadingStatusId;
    Estado: string;
    Total: number;
    Porcentaje?: number | null;
}

export interface CatalogRatingDistributionItem {
    Puntuacion: 1 | 2 | 3 | 4 | 5;
    Total: number;
}

export interface CatalogPublicActivityStats {
    PrimeraFechaAgregado?: string | null;
    UltimaFechaAgregado?: string | null;
    UltimaFechaActualizacionBiblioteca?: string | null;
    UltimoCambioEstado?: string | null;
}

export interface CatalogRankingMetric {
    Valor?: number | null;
    Ranking: number;
    TotalItems: number;
    Percentil?: number | null;
}

export interface CatalogMetadataPopularity {
    Id: number;
    Nombre: string;
    Codigo?: string | null;
    Bibliotecas?: CatalogRankingMetric | null;
}

export interface CatalogPublicStats {
    UsuariosEnBiblioteca: number;
    PuntuacionMedia: number | null;
    TotalPuntuaciones: number;
    DistribucionPuntuaciones?: CatalogRatingDistributionItem[];
    TotalConEstado?: number;
    TotalEnEspera?: number;
    TotalLeidos: number;
    TotalEnMarcha: number;
    TotalQuieroLeer: number;
    TotalPorComprar: number;
    TotalDescartados: number;
    DistribucionEstados: CatalogStateDistributionItem[];
    ActividadAgregada?: CatalogPublicActivityStats | null;
    Popularidad?: {
        Bibliotecas?: CatalogRankingMetric | null;
        Puntuacion?: CatalogRankingMetric | null;
    } | null;
    PopularidadPorIdioma?: CatalogMetadataPopularity[];
    PopularidadPorEstilo?: CatalogMetadataPopularity[];
}

export interface CatalogOwnCollection {
    EnBiblioteca: boolean;
    EstadoActual?: ReadingState | null;
    Estados: ReadingState[];
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
    FechaAgregado?: string | null;
    FechaActualizacion?: string | null;
}

export interface CatalogPublicReview {
    Id?: number;
    UsuarioId?: number | null;
    Usuario?: CatalogOption | null;
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
    Fecha?: string | null;
    FechaCreacion?: string | null;
    EsMia?: boolean;
    EsPropia?: boolean;
}

export interface CatalogPublicDetail extends CatalogItem {
    Paginas?: number | null;
    MiColeccion?: CatalogOwnCollection | null;
    Resenas?: CatalogPublicReview[];
    ResenasPublicas?: CatalogPublicReview[];
    ResenasVisibles?: CatalogPublicReview[];
    Estadisticas: CatalogPublicStats;
}

export interface BookLanguagesWrite {
    IdiomaId?: number;
    Idiomas?: Array<number | { Id: number }>;
}

export interface BookLanguagesUpdated {
    success: boolean;
    LibroId: number;
    IdiomasDisponibles: CatalogOption[];
}

export interface CollectionItem extends CatalogItem {
    Orden?: number;
    PorcentajeCompletado?: number | null;
    FechaAgregado?: string | null;
    FechaActualizacion?: string | null;
}

export interface CollectionSaga {
    Id: number;
    Nombre: string;
    Subtitulo?: string | null;
    Autores?: Author[];
    Orden?: number;
    Libros?: CollectionItem[];
    Antologias?: CollectionItem[];
}

export interface CollectionUniverse {
    Id: number;
    Nombre: string;
    Autores?: Author[];
    Libros?: CollectionItem[];
    Antologias?: CollectionItem[];
    Sagas?: CollectionSaga[];
}

export interface RatingWrite {
    Puntuacion: number;
    Resena?: string | null;
}

export interface ReviewWrite {
    Resena: string | null;
}

export interface ReadingStatusWrite {
    EstadoId: ReadingStatusId;
    Fecha?: string | null;
}

export interface CollectionWriteResponse {
    success: boolean;
}

export interface ReadingStatusUpdateResponse extends CollectionWriteResponse {
    Estado: {
        Id: number;
        EstadoId: ReadingStatusId;
        Nombre: string;
        Fecha?: string | null;
    };
}

export interface RatingUpdateResponse extends CollectionWriteResponse {
    Puntuacion: number;
    Resena?: string | null;
    ResenaOculta?: boolean;
}

export interface ReviewUpdateResponse extends CollectionWriteResponse {
    Resena: string | null;
    ResenaOculta: boolean;
}

export type ReportEntityType = 'libro' | 'antologia';
export type ReportStatus = 'pendiente' | 'aceptado' | 'rechazado';
export type ReportStatusFilter = ReportStatus | 'todos';

export interface ReportCreate {
    TipoFuente: 'resena';
    EntidadTipo: ReportEntityType;
    EntidadId: number;
    UsuarioFuenteId: number;
    Motivo: string;
}

export interface ReportCreated {
    success: boolean;
    Id: number;
    GrupoId: number;
    Estado: 'pendiente';
}

export interface ReportResolve {
    Estado: Exclude<ReportStatus, 'pendiente'>;
    Comentario?: string | null;
}

export interface ReportGroupResolved {
    success: boolean;
    Id: number;
    Estado: Exclude<ReportStatus, 'pendiente'>;
}

export interface ReportGroup {
    Id: number;
    TipoFuente: 'resena';
    EntidadTipo: ReportEntityType;
    EntidadId: number;
    Estado: ReportStatus;
    TotalReportes: number;
    Fuente?: {
        Usuario?: CatalogOption | null;
        Item?: {
            Id: number;
            Tipo: ReportEntityType;
            Nombre: string;
        } | null;
        Resena?: string | null;
        ResenaOculta?: boolean;
    } | null;
    Reportes?: Array<{
        Id: number;
        Usuario?: CatalogOption | null;
        Motivo: string;
        FechaCreacion?: string | null;
    }>;
    Resolucion?: {
        Estado: Exclude<ReportStatus, 'pendiente'>;
        Comentario?: string | null;
        Moderador?: CatalogOption | null;
        FechaResolucion?: string | null;
    } | null;
    FechaCreacion?: string | null;
    FechaActualizacion?: string | null;
}

export interface CatalogRequestCreate {
    TipoEntidad: CatalogEntityType;
    Accion: CatalogRequestAction;
    EntidadId?: number | null;
    Payload: Record<string, unknown>;
}

export interface CatalogRequestCreated {
    success: boolean;
    Id: number;
    Estado: 'pendiente';
}

export interface CatalogRequest {
    Id: number;
    Usuario?: {
        Id: number;
        Nombre: string;
    };
    TipoEntidad: CatalogEntityType;
    Accion: CatalogRequestAction;
    EntidadId?: number | null;
    Payload: Record<string, unknown>;
    Estado: CatalogRequestStatus;
    ComentarioResolucion?: string | null;
    FechaCreacion?: string | null;
    FechaResolucion?: string | null;
}

export interface CatalogRequestResolve {
    Estado: Exclude<CatalogRequestStatus, 'pendiente'>;
    Comentario?: string | null;
}

export interface CatalogRequestResolved {
    success: boolean;
    Id: number;
    Estado: Exclude<CatalogRequestStatus, 'pendiente'>;
    EntidadId?: number | null;
}
