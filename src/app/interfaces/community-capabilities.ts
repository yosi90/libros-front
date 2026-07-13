export type CommunityCapabilityId = 'sanciones' | 'realtime' | 'notificaciones' | 'feed' | 'chat' | 'clubes';

export interface CommunityCapability {
    Activa: boolean;
    VersionMinima: string | null;
}

export interface CommunityCapabilitiesResponse {
    UsuarioId: number;
    VersionConfiguracion: number;
    VersionCliente: string | null;
    FechaExpiracion: string | null;
    CacheTtlSegundos: number;
    Conservadora: boolean;
    Capacidades: Record<CommunityCapabilityId, CommunityCapability>;
}

export interface OperationalMetricBucket {
    Canal: 'realtime' | 'firestore' | 'push';
    Hora: string;
    Total: number;
    Entregadas: number;
    Pendientes: number;
    DeadLetters: number;
    Reintentos: number;
}

export interface OperationalMetrics {
    Granularidad: 'hora';
    VentanaHoras: number;
    RetrasoEsperadoSegundos: number;
    RetencionDias: Record<string, number>;
    Entregas: OperationalMetricBucket[];
    DenegacionesGate: { Hora: string; Categoria: 'gate'; Codigo: string; VersionConfiguracion: number; Cantidad: number }[];
    EstadoActual: { MiembrosClubActivos: number; SancionesActivas: number; AlegacionesPendientes: number; VersionConfiguracion: number | null };
    NoInstrumentado: string[];
}
