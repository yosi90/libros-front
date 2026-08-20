import { Antology } from "./antology";
import { Author } from "./author";
import { BookSimple } from "./book";
import { Saga } from "./saga";

export interface Universe {
    Id: number;
    Nombre: string;
    Autores: Author[];
    Sagas: Saga[];
    Libros: BookSimple[];
    Antologias: Antology[];
}
export interface UniverseSimple {
    Id: number;
    Nombre: string;
}

export interface UniverseWrite {
    Id?: number;
    Nombre: string;
    Autores: Pick<Author, 'Id'>[];
}

export interface UniverseSectionWrite {
    UniversoId: number;
    LibroId: number;
}

export interface UniverseStateSummary {
    Total: number;
    Comprados: number;
    Leidos: number;
    Pendientes: number;
    EnMarcha: number;
    PorComprar: number;
    QuieroLeer: number;
    Descartados: number;
    SinEstado: number;
}

export interface UniverseMetricsSummary {
    Libros: UniverseStateSummary;
    Antologias: UniverseStateSummary;
    Secciones: UniverseStateSummary;
    TotalCapitulos?: number;
    TotalCapitulosInterludio?: number;
    TotalPersonajes?: number;
}

export interface UniverseMetricBookSummary {
    Id: number;
    Nombre: string;
}

export interface UniverseMonthlyPurchases {
    Anio: number;
    Mes: number;
    Cantidad: number;
    Libros: UniverseMetricBookSummary[];
}

export interface UniverseReadingDuration {
    HorasTotales: number;
    Dias: number;
    Horas: number;
}

export interface UniverseFastestBook extends UniverseMetricBookSummary {
    FechaInicio: string;
    FechaFin: string;
    TiempoLectura: UniverseReadingDuration;
}

export interface UniverseLongestPendingBook extends UniverseMetricBookSummary {
    FechaUltimoEstado: string;
    Dias: number;
}

export interface UniverseRecurringCharacter extends UniverseMetricBookSummary {
    Apariciones: number;
}

export interface UniverseMetricsBreakdown {
    Resumen: UniverseMetricsSummary;
    ComprasUltimosMeses: UniverseMonthlyPurchases[];
    LibroMasRapido: UniverseFastestBook | null;
    LibroMasTiempoPendiente: UniverseLongestPendingBook | null;
    PersonajeMasRecurrente: UniverseRecurringCharacter | null;
}

export interface UniverseMetricsResponse extends UniverseMetricsBreakdown {
    TopLibrosMasRapidos: UniverseFastestBook[];
    PorUniverso: Record<string, UniverseMetricsBreakdown>;
}
