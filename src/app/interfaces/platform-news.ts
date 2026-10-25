import { PlataformaPersona } from './platform-person';

// Las novedades de las webs tal como las cuenta la plataforma (administracion yosiftware: docs/publica/ENDPOINTS.md,
// «Novedades de las webs»; ecosistema-kit/NOVEDADES.md, «Enseñar el feed en tu web»). Con el token de Libros solo
// llegan las publicadas desde Libros.

export interface NovedadCabecera { imagen: string; textoAlternativo: string }

export interface Novedad {
    id: number;
    web: { clave: string; nombre: string };
    tipo: { clave: string; nombre: string };
    persona: PlataformaPersona;
    /** Ya redactado en tercera persona y sin el nombre («ha empezado a leer «Dune»»): la tarjeta pone el nombre delante. */
    texto: string;
    enlace: string | null;
    imagen: string | null;
    creada: string;
    actualizada?: string | null;
    meGusta: { total: number; propio: boolean };
    comentarios: number;
    relacion: 'propia' | 'amistad' | 'seguida' | 'ninguna';
    cabecera?: NovedadCabecera | null;
}

export interface NovedadesPagina { novedades: Novedad[]; cursor: string | null }

export interface ComentarioDeNovedad {
    id: number;
    persona: PlataformaPersona;
    texto: string;
    creado: string;
    propio: boolean;
}

export interface ComentariosPagina { comentarios: ComentarioDeNovedad[]; cursor: string | null }
