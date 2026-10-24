// El chat de la plataforma tal como lo cuenta su contrato (administracion yosiftware: docs/publica/ENDPOINTS.md,
// «Chat», y asyncapi.yaml). Libros lo traduce a su propio modelo (`interfaces/chat.ts`) para pintarlo con su interfaz.

export interface PlataformaAvatar { url: string; miniatura: string; version?: number }

export interface PlataformaPersona {
    id: string;
    alias: string;
    nombre: string | null;
    privado?: boolean;
    avatar: PlataformaAvatar | null;
    borrada?: boolean;
}

export interface PlataformaRespuesta {
    id: number;
    persona: PlataformaPersona | null;
    texto: string | null;
    borrado: boolean;
    noDisponible: boolean;
}

export interface PlataformaAviso {
    codigo: string;
    datos: Record<string, unknown> | null;
    /** Las personas que nombra, por id (algunas versiones las mandan como lista). */
    personas: Record<string, PlataformaPersona> | PlataformaPersona[] | null;
}

export interface PlataformaMensaje {
    id: number;
    conversacion: number;
    tipo: 'texto' | 'aviso';
    persona: PlataformaPersona | null;
    texto: string | null;
    aviso: PlataformaAviso | null;
    respuesta: PlataformaRespuesta | null;
    reacciones: { total: Record<string, number>; mia: string | null } | null;
    editado: string | null | boolean;
    borrado: boolean;
    retirado?: boolean;
    noDisponible: boolean;
    /** No llega en los eventos del tiempo real: se deduce de la cuenta. */
    propio?: boolean;
    idCliente?: string | null;
    creado: string;
    caduca?: string | null;
    susurro?: boolean;
}

export interface PlataformaPermisos {
    escribir: boolean;
    invitar: boolean;
    administrar: boolean;
    salir: boolean;
    borrar: boolean;
    ajustes?: boolean;
}

export interface PlataformaConversacion {
    id: number;
    tipo: 'directa' | 'grupo' | 'web';
    titulo: string | null;
    persona: PlataformaPersona | null;
    web: { clave: string; nombre: string } | null;
    miembros: number;
    rol: 'miembro' | 'admin';
    noLeidos: number;
    ultimoMensaje: PlataformaMensaje | null;
    actividad: string;
    cerrada: boolean;
    privacidadAlta?: boolean;
    temporal?: number | null;
    permisos: PlataformaPermisos;
}

export interface PlataformaParticipante {
    persona: PlataformaPersona;
    rol: 'miembro' | 'admin';
    ultimoLeido?: number | null;
}

export interface PlataformaInvitacionPendiente {
    id: number;
    persona?: PlataformaPersona | null;
    cuenta?: string;
    creada?: string;
}

export interface PlataformaConversacionDetalle extends PlataformaConversacion {
    historial?: 'desde_ingreso' | 'completo';
    participantes?: PlataformaParticipante[];
    invitaciones?: PlataformaInvitacionPendiente[];
}

export interface PlataformaPaginaMensajes {
    mensajes: PlataformaMensaje[];
    cursor: number | string | null;
}

/** Una amistad (`GET /v1/social/amistades`). */
export interface PlataformaVinculo {
    persona: PlataformaPersona;
    desde?: string;
}

export interface PlataformaPaginaVinculos {
    vinculos: PlataformaVinculo[];
    cursor: string | null;
}
