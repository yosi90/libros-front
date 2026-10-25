// Una persona de la plataforma tal como la cuenta su contrato (administracion yosiftware: docs/publica/ENDPOINTS.md):
// la misma en el chat, en las amistades y en la búsqueda de personas de los espacios (`GET /v1/personas`).

/** `url` (256 px) y `miniatura` (64 px) llegan relativas a la API de la plataforma (`platformAssetUrl`). */
export interface PlataformaAvatar { url: string; miniatura: string; version?: number }

export interface PlataformaPersona {
    id: string;
    alias: string;
    nombre: string | null;
    privado?: boolean;
    avatar: PlataformaAvatar | null;
    borrada?: boolean;
}
