// Los espacios de la plataforma tal como los cuenta su contrato (administracion yosiftware: docs/publica/ENDPOINTS.md,
// «Espacios», y ecosistema-kit/ESPACIOS.md). Cada club de Libros es un espacio: la plataforma lleva quién está, con qué
// rol y cómo se entra; Libros, todo lo demás del club (ADHESION_YOSIFTWARE.md, «Los clubes»).

/** Lo de la persona en un espacio: para enseñar u ocultar botones. La autorización de verdad es la de la API. */
export interface YoEnEspacio {
    rol: string | null;
    nombreRol: string | null;
    propietario: boolean;
    estado: 'activo' | 'sin_dos_pasos';
    capacidades: { gestionar: boolean; invitar: boolean; chat: 'escribir' | 'leer' | 'nada' };
}

export interface EspacioPlataforma {
    id: number;
    /** `club-<Id>` en Libros. */
    idExterno: string;
    web?: { clave: string; nombre: string };
    nombre: string;
    entrada: 'invitacion' | 'solicitud' | 'abierto';
    dosPasos: boolean;
    propietario: string;
    miembros: number;
    conversacion: number | null;
    creado?: string;
    yo: YoEnEspacio | null;
    traspaso?: { cuenta: string; rolSaliente: string | null; caduca: string } | null;
}

/** Una invitación pendiente de la persona (`GET /v1/espacios/invitaciones` y `POST …/por-codigo`). */
export interface InvitacionRecibida {
    id: number;
    espacio: { id: number; idExterno: string; nombre: string; dosPasos: boolean };
    web?: { clave: string; nombre: string };
    de: { cuenta: string; nombre: string };
    rol: string | null;
    nombreRol?: string | null;
    miembros?: number;
    caduca: string;
}

/** Una invitación pendiente de un espacio (`GET /v1/espacios/{id}/invitaciones`, quien puede invitar). */
export interface InvitacionEnviada {
    id: number;
    /** `null` en una invitación a un correo. */
    cuenta: string | null;
    alias: string | null;
    /** Enmascarado. */
    correo: string | null;
    rol: string | null;
    /** La cuenta que la envió. */
    de: string;
    creada: string;
    caduca: string;
}

/** Una solicitud para entrar en un espacio (`GET /v1/espacios/{id}/solicitudes`, quien puede invitar). */
export interface SolicitudDeEntrada {
    id: number;
    cuenta: string;
    alias: string;
    nombre: string | null;
    mensaje: string | null;
    creada: string;
}

/** Una persona de la plataforma en la búsqueda (`GET /v1/personas?q=`). */
export interface PersonaBuscada {
    id: string;
    alias: string;
    nombre: string | null;
    privado?: boolean;
    avatar: { url: string; miniatura: string; version?: number } | null;
    borrada?: boolean;
}

/** Los roles del espacio de un club que se pueden dar al invitar (los declara la API de Libros). */
export type RolDeInvitacion = 'miembro' | 'moderacion';

/** Lo que llega por el canal de un espacio (`yosiftware.espacios.canal`, ESPACIOS.md, «6. El canal»). */
export type MensajeDelCanal =
    | { tipo: 'abierto'; espacio: number; presentes: string[] }
    | { tipo: 'mensaje'; espacio: number; secuencia: number; idExterno: string; datos: Record<string, unknown>; fecha: string }
    | { tipo: 'presencia'; espacio: number; presentes: string[] }
    /** Lo perdido ya no se conserva: recargar de la API. */
    | { tipo: 'desfase'; espacio: number }
    /** La persona ya no es miembro activo: deja de llegar. */
    | { tipo: 'cerrado'; espacio: number; motivo: string }
    | { tipo: 'error'; espacio: number; code: string };

export interface CanalDeEspacio {
    readonly espacio: number;
    readonly presentes: string[];
    cerrar(): void;
}
