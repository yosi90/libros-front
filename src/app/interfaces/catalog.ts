import { Author } from './author';
import { AnthologySectionProgress, Antology } from './antology';
import { BookSimple } from './book';
import { ReadingState, ReadingStatusId } from './read-status';
import { SagaChain } from './saga';

export type CatalogEntityType = 'autor' | 'universo' | 'saga' | 'libro' | 'antologia' | 'otro';
export type CatalogRequestAction = 'alta' | 'edicion' | 'comentario';
export type CatalogRequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'devuelta';
export type OwnCatalogRequestStatusFilter = CatalogRequestStatus | 'activas' | 'historial' | 'todas';
export type CatalogItemType = 'libro' | 'antologia';

export interface Edition {
    Id: number;
    ISBN: string | null;
    Portada: string;
    FechaPublicacion: string | null;
    EnMiBiblioteca: boolean;
}

export interface WorkEditions {
    Tipo: CatalogItemType;
    ObraId: number;
    Ediciones: Edition[];
}

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

export interface CatalogItemsPage {
    Items: CatalogItem[];
    Page: number;
    PageSize: number;
    Total: number;
    HasMore: boolean;
}

export interface CatalogAuthorsPage {
    Items: Author[];
    Page: number;
    PageSize: number;
    Total: number;
    HasMore: boolean;
}

export interface CatalogPagedQuery extends CatalogQuery {
    page?: number;
    pageSize?: number;
}

/** El filtro «Nuevos» del catálogo: obras dadas de alta en las últimas 24 horas, 7 días o 30 días. */
export type CatalogNewWorksWindow = '24h' | '7d' | '30d';

export const CATALOG_NEW_WORKS_OPTIONS: ReadonlyArray<{ value: CatalogNewWorksWindow; label: string }> = [
    { value: '24h', label: 'Últimas 24 horas' },
    { value: '7d', label: 'Última semana' },
    { value: '30d', label: 'Último mes' }
];

export function isCatalogNewWorksWindow(value: unknown): value is CatalogNewWorksWindow {
    return value === '24h' || value === '7d' || value === '30d';
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
    nuevos?: CatalogNewWorksWindow;
}

export interface CatalogItem {
    Tipo: CatalogItemType;
    Id: number;
    Nombre: string;
    Portada: string | null;
    ISBN?: string | null;
    Ediciones?: Edition[];
    Sinopsis?: string | null;
    Paginas?: number | null;
    FechaPublicacion?: string | null;
    /** Cuándo entró en el catálogo (UTC). Aproximada en las obras de antes de guardarla: nunca son «nuevas». */
    FechaAlta?: string | null;
    FechaAltaAproximada?: boolean;
    Autores: Author[];
    Estados: ReadingState[];
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
    IdiomasDisponibles?: CatalogOption[] | null;
    Estilos?: CatalogOption[] | null;
    Estilo?: string | null;
    PuedeAbrirNarrativa?: boolean;
    NarrativaPersonalDisponible?: boolean;
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
    EdicionesIds?: number[];
    EstadoActual?: ReadingState | null;
    Estados: ReadingState[];
    Puntuacion?: number | null;
    Resena?: string | null;
    ResenaOculta?: boolean;
    PuedeAbrirNarrativa?: boolean;
    NarrativaPersonalDisponible?: boolean;
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

/** Detalle canónico de antología: añade su ubicación para precargar el editor de administración. */
export interface CatalogAnthologyPublicDetail extends CatalogPublicDetail {
    Universo: { Id: number; Nombre: string } | null;
    Saga: { Id: number; Nombre: string; Subtitulo: string | null } | null;
}

export interface GoogleBooksIsbnMetadata {
    ISBN?: string | null;
    Nombre?: string | null;
    Portada?: string | null;
    PortadaUrl?: string | null;
    Autores?: string[];
    Estilos?: string[];
    FechaPublicacion?: string | null;
    Sinopsis?: string | null;
}

export interface CollectionItem extends CatalogItem {
    Orden?: number;
    PorcentajeCompletado?: number | null;
    FechaAgregado?: string | null;
    FechaActualizacion?: string | null;
    PuedeAbrirNarrativa?: boolean;
    NarrativaPersonalDisponible?: boolean;
    SeccionesProgreso?: AnthologySectionProgress[];
}

export interface CollectionSaga extends SagaChain {
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
    PublicarActividad?: boolean | null;
}

export interface ReviewWrite {
    Resena: string | null;
    PublicarActividad?: boolean | null;
}

export interface ReadingStatusWrite {
    EstadoId: ReadingStatusId;
    Fecha?: string | null;
    PublicarActividad?: boolean | null;
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
export type OwnReportStatusFilter = ReportStatus | 'activas' | 'historial' | 'todos';

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
    Estado: 'pendiente' | 'aprobada' | 'devuelta';
    HttpStatus?: number;
    GrupoISBN?: number;
    EntidadId?: number;
    EdicionId?: number;
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
    ISBN?: string | null;
    GrupoISBN?: number | null;
    Participantes?: number;
    Payload: Record<string, unknown>;
    Estado: CatalogRequestStatus;
    ComentarioResolucion?: string | null;
    FechaCreacion?: string | null;
    FechaResolucion?: string | null;
}

export interface CatalogRequestResponse {
    Payload: Record<string, unknown>;
}
