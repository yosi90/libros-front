/**
 * Lo que la API de Libros activa de su Comunidad: solo los clubes. El chat, las notificaciones, el tiempo real y las
 * sanciones son de la plataforma, y el muro general (`feed`) se retiró con la adhesión: la web no los mira aunque la
 * API aún anuncie `feed`.
 */
export type CommunityCapabilityId = 'clubes';

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
