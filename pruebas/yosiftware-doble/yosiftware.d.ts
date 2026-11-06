/**
 * SDK de la plataforma Yosiftware, versión 1.
 *
 * Se carga desde la página de acceso de cada entorno, por ejemplo:
 *
 *     <script type="module" src="https://cuentas.yosiftware.es/sdk/v1/yosiftware.js"></script>
 *
 * o con `import { yosiftware } from "https://cuentas.yosiftware.es/sdk/v1/yosiftware.js"`. Al cargarse
 * comprueba la sesión central, registra `<yosi-acceso>`, `<yosi-reportar>`, `<yosi-perfil>`, los elementos del chat
 * (`<yosi-chat>`, `<yosi-chat-bandeja>` y `<yosi-chat-conversacion>`) y los de las notificaciones
 * (`<yosi-notificaciones>` y `<yosi-notificaciones-lista>`) y deja el SDK en
 * `window.yosiftware`.
 * Guía completa en `ecosistema-kit/ACCESO.md`.
 */

/** La cuenta de Yosiftware con la que se ha entrado. */
export interface CuentaYosiftware {
  /** Identificador estable de la persona en todo el ecosistema (el `sub` de los tokens). */
  id: string;
  /** Alias público. Puede cambiar: no lo uses como identificador. */
  alias: string;
  correo: string;
  /**
   * Una cuenta creada con correo y contraseña se usa desde el primer momento, aunque no haya confirmado el correo
   * (2026-11-05). Mientras no lo confirme, la parte social de la plataforma le responde `403 correo_sin_confirmar`, y el
   * SDK le recuerda que lo confirme (`confirmarCorreo()`).
   */
  correoVerificado: boolean;
  /**
   * Con el correo sin confirmar: hasta cuándo hay para confirmarlo (ISO 8601, 7 días desde el alta). Después, la cuenta
   * se borra. `null` si ya está confirmado (SDK 1.32).
   */
  confirmarCorreoAntesDe?: string | null;
  /** `pendiente_verificacion` ya no se da con una sesión abierta (2026-11-05); se conserva en el contrato. */
  estado: "pendiente_verificacion" | "activa" | "suspendida" | "cerrada";
  /**
   * Si es una cuenta del propietario del ecosistema. El SDK ya marca el dispositivo para que Yosiftadísticas no
   * lo cuente (`localStorage["yosiftadisticas:excluir"] = "1"`, que no se borra al salir): la web no tiene que
   * hacer nada ni mantener su propia lista de cuentas del propietario.
   */
  propietario: boolean;
}

/** Lo que la cuenta tiene limitado por moderación (`docs/publica/MODERACION.md`). */
export type AlcanceRestringido = "comunidad" | "chat" | "publicacion" | "creacion";

export interface Restricciones {
  /** Con `comunidad` vienen también `chat` y `publicacion`. */
  alcances: AlcanceRestringido[];
  /** Cuándo termina lo último (ISO 8601); `null` si alguna es permanente. */
  hasta: string | null;
}

/** Las normas propias de la web que la persona tiene que aceptar (las enseña el SDK solo). */
export interface NormasPendientesDeLaWeb {
  id: number;
  version: number;
  titulo: string;
  importante: boolean;
  publicadas: string;
}

export type EstadoSesion =
  /** Aún no se sabe: el SDK está preguntando a la plataforma. */
  | { tipo: "comprobando" }
  /**
   * Sin sesión. Con `motivo: "normas_pendientes"`, la sesión existe pero la cuenta tiene sin aceptar una versión
   * importante de las normas de uso: el SDK abre solo el acceso, que se las enseña.
   */
  | { tipo: "sin_sesion"; motivo?: "normas_pendientes" }
  /**
   * Sin sesión en esta web: está en pruebas privadas y la cuenta con la que se ha entrado (`alias`) no está en su
   * lista. La sesión de Yosiftware sigue (las demás webs la reconocen). El SDK enseña solo, una vez, su ventana
   * (`<yosi-web-privada>`), con «Cambiar de cuenta».
   */
  | { tipo: "sin_sesion"; motivo: "acceso_restringido"; web: string | null; alias: string | null }
  /**
   * Con sesión. `restricciones` solo viene si la cuenta tiene algo limitado; `normasPendientes`, si le faltan las
   * normas propias de esta web (el SDK se las enseña y, al aceptarlas, renueva los tokens).
   */
  | { tipo: "con_sesion"; cuenta: CuentaYosiftware; restricciones?: Restricciones; normasPendientes?: NormasPendientesDeLaWeb }
  /** La plataforma no responde, o esta web no está en su registro. El SDK lo vuelve a intentar solo. */
  | { tipo: "no_disponible" };

export interface OpcionesDeEntrada {
  /** Formulario con el que se abre el acceso. Por defecto, `entrar`. */
  vista?: "entrar" | "registro";
}

export interface OpcionesDePrivacidad {
  /** Abre el recorrido guiado por la privacidad (el que sale solo una vez por cuenta) en vez del panel. */
  recorrido?: boolean;
}

/** Las opciones de `normasDeLaWeb()` (SDK 1.31). */
export interface OpcionesDeNormasDeLaWeb {
  /** Por qué las pide la web ahora, en una frase corta y en su idioma. */
  motivo?: string;
}

export interface OpcionesDeReporte {
  /** Si la web lo fija, el formulario empieza en ese tipo; si no, la persona elige. */
  tipo?: "error" | "propuesta";
}

/** Lo que se denuncia a la moderación de Yosiftware (`yosiftware.denunciar`). */
export interface ObjetoDeDenuncia {
  tipo: "persona" | "mensaje" | "novedad" | "comentario";
  /** El `id` de la cuenta, del mensaje, de la novedad o del comentario en la plataforma. */
  referencia: string | number;
  /** Para enseñarlo en la ventana: quién (alias o nombre). */
  nombre?: string;
  /** Para enseñarlo citado: el texto (la plataforma guarda su propia copia). */
  extracto?: string;
  /**
   * El `id` de la cuenta de quien escribió el mensaje, la novedad o el comentario. Con él (y siempre al denunciar a una
   * persona), al terminar la ventana propone bloquearla o dejar de ser amistades.
   */
  persona?: string;
  /** Con `tipo: "persona"`: la conversación directa con ella que se denuncia entera (se copian sus últimos mensajes). */
  conversacion?: number;
}

export interface EnlaceDePerfil {
  titulo: string;
  url: string;
}

export interface AvatarDePerfil {
  version: number;
  /** Dirección pública de la imagen (256 px, WebP), con `?v=` para la caché. Vale en `<img>` sin token. */
  url: string;
  /** La miniatura de 64 px. */
  miniatura: string;
}

/** El perfil propio de la cuenta, el mismo en todas las webs. Todo es opcional salvo el alias. */
export interface PerfilPropio {
  id: string;
  alias: string;
  nombre: string | null;
  nombreCompleto: string | null;
  biografia: string | null;
  pronombres: string | null;
  identidadDeGenero: string | null;
  ubicacion: string | null;
  idioma: string | null;
  /** `AAAA-MM-DD`. */
  fechaNacimiento: string | null;
  web: string | null;
  enlaces: EnlaceDePerfil[];
  /** Con el perfil privado, los demás solo ven el alias y el avatar. */
  privado: boolean;
  avatar: AvatarDePerfil | null;
  creada: string;
  version: number;
  actualizado: string | null;
  aliasCambiableDesde: string | null;
}

/** El bloque de ajustes de esta web para la cuenta: un documento JSON que solo esta web lee y escribe. */
export interface AjustesDeLaWeb {
  version: number;
  documento: Record<string, unknown>;
}

/** Cambios por claves de primer nivel: `null` quita la clave; las demás se quedan como están. */
export type CambiosDeAjustes = Record<string, unknown>;

/** Un evento del tiempo real de la plataforma (`docs/publica/asyncapi.yaml`). */
export interface EventoTiempoReal {
  /** Creciente por cuenta. El SDK la guarda como cursor para pedir lo perdido al reconectar. */
  secuencia: number;
  /** `perfil.cambiado`, `sesion.revocada`… y los que añade cada bloque (el chat, las notificaciones). */
  tipo: string;
  datos: Record<string, unknown> | null;
  /** ISO 8601, UTC. */
  fecha: string;
}

export type EstadoTiempoReal =
  /** Sin conexión: nadie escucha, o se cerró a propósito. */
  | { tipo: "desconectado" }
  | { tipo: "sin_sesion" }
  | { tipo: "conectando" }
  | { tipo: "conectado" }
  /** Se perdió la conexión; se reintenta en `enMs`. */
  | { tipo: "reconectando"; motivo: string; enMs: number };

/** Un aviso efímero del tiempo real: no se guarda ni lleva secuencia (`asyncapi.yaml`, `escribiendo` y `presencia`). */
/** Un espacio (un club, un grupo, una organización) de esta web, con lo de la persona en él (`yo`). */
export interface EspacioDeYosiftware {
  id: number;
  idExterno: string;
  web: { clave: string; nombre: string };
  nombre: string;
  entrada: "invitacion" | "solicitud" | "abierto";
  dosPasos: boolean;
  propietario: string;
  miembros: number;
  conversacion: number | null;
  creado: string;
  yo: {
    rol: string | null;
    nombreRol: string | null;
    propietario: boolean;
    estado: "activo" | "sin_dos_pasos";
    capacidades: { gestionar: boolean; invitar: boolean; chat: "escribir" | "leer" | "nada" };
  } | null;
  traspaso: { cuenta: string; rolSaliente: string | null; caduca: string } | null;
}

export interface MiembroDeEspacio {
  cuenta: string;
  alias: string;
  nombre: string | null;
  avatarVersion: number | null;
  rol: string | null;
  propietario: boolean;
  estado: "activo" | "sin_dos_pasos";
  entrada: string;
}

/** Una invitación pendiente de la persona. */
export interface InvitacionAEspacio {
  id: number;
  espacio: { id: number; idExterno: string; nombre: string; dosPasos: boolean };
  web: { clave: string; nombre: string };
  de: { cuenta: string; nombre: string };
  rol: string | null;
  nombreRol: string | null;
  miembros: number;
  caduca: string;
}

/** Lo que llega por el canal de un espacio. */
export type MensajeDelCanal =
  | { tipo: "abierto"; espacio: number; presentes: string[] }
  | { tipo: "mensaje"; espacio: number; secuencia: number; idExterno: string; datos: Record<string, unknown>; fecha: string }
  | { tipo: "presencia"; espacio: number; presentes: string[] }
  /** Lo perdido ya no se conserva: recarga de tu API. */
  | { tipo: "desfase"; espacio: number }
  /** La persona ya no es miembro activo: deja de llegar. */
  | { tipo: "cerrado"; espacio: number; motivo: string }
  | { tipo: "error"; espacio: number; code: string };

export interface CanalDeEspacio {
  readonly espacio: number;
  /** Las cuentas que tienen el espacio abierto ahora. */
  readonly presentes: string[];
  cerrar(): void;
}

/** El evento que lanza el SDK en `window` al aceptar o rechazar una invitación desde su ventana. */
export type EventoDeEspacio =
  | { tipo: "aceptada"; espacio: EspacioDeYosiftware | null }
  | { tipo: "rechazada"; invitacion: number };

/** Una web que acepta encargos de un tipo (`GET /v1/encargos/servicios`). */
export interface ServicioDeEncargo {
  /** Su clave, la que va en `destino`. */
  web: string;
  nombre: string;
  tipo: string;
  /** El texto de su botón («Generar con p.i.c.»). */
  boton: string;
}

/** Un encargo entre webs (`ecosistema-kit/ENCARGOS.md`). */
export interface EncargoDeYosiftware {
  id: string;
  /** Lo que es en él esta web. */
  papel: "origen" | "destino";
  origen: string;
  nombreOrigen: string;
  destino: string;
  nombreDestino: string;
  tipo: string;
  titulo: string;
  /** Lo que puso la web de origen, tal cual. */
  indicaciones: Record<string, unknown> | null;
  /** Cuántas imágenes como mucho. */
  maximo: number;
  idExterno: string | null;
  /** Adónde vuelve la persona en la web de origen. */
  volver: string | null;
  estado: "pendiente" | "entregado" | "recogido" | "cancelado" | "caducado";
  creado: string;
  /** Hasta cuándo se puede entregar (pendiente) o recoger (entregado). */
  caduca: string;
  entregado: string | null;
  cerrado: string | null;
  archivos: { papel: "referencia" | "entrega"; numero: number; ancho: number; alto: number }[];
  /** Dónde se abre en la web de destino, mientras está pendiente. */
  abrir: string | null;
}

/** Lo que pide la web de origen (`POST /v1/encargos`). */
export interface PedidoDeEncargo {
  /** La clave de la web que lo hace (de `servicios()`). */
  destino: string;
  tipo: string;
  /** Hasta 120 caracteres: «Retrato de Aelar». */
  titulo: string;
  /** Un objeto libre para la web de destino (`{ texto, formato… }`), hasta 4000 caracteres. */
  indicaciones?: Record<string, unknown>;
  /** Cuántas imágenes como mucho, de 1 a 10 (por defecto, 1). */
  maximo?: number;
  /** El tuyo: mientras haya uno abierto con él, se devuelve ese en vez de crear otro. */
  idExterno?: string;
  /** Una dirección de esta web adonde lleva la notificación de la entrega. Por defecto, la página actual. */
  volver?: string;
  /** Una imagen de referencia (JPEG, PNG o WebP). */
  referencia?: Blob;
}

/** El aviso del tiempo real de que un encargo ha cambiado (`encargo.cambiado`). */
export interface CambioDeEncargo {
  encargo: string;
  estado: EncargoDeYosiftware["estado"];
  origen: string;
  destino: string;
}

export type AvisoTiempoReal =
  | { tipo: "escribiendo"; conversacion: number; cuenta: string }
  | { tipo: "presencia"; cuenta: string; enLinea: boolean; ultimaVez?: string };

/** Una persona tal como sale en el chat. El avatar llega con direcciones completas. */
export interface PersonaDelChat {
  id: string;
  alias: string;
  nombre: string | null;
  privado: boolean;
  avatar: AvatarDePerfil | null;
  /** Una cuenta borrada: `alias` es `cuenta-borrada`, `nombre` es «Cuenta borrada» y no tiene perfil ni avatar. */
  borrada?: boolean;
}

/** Un mensaje del chat (`docs/publica/ENDPOINTS.md`, «Chat»). */
export interface MensajeDelChat {
  id: number;
  conversacion: number;
  tipo: "texto" | "aviso";
  persona: PersonaDelChat | null;
  texto: string | null;
  aviso: { codigo: string; datos: Record<string, unknown>; personas: Record<string, PersonaDelChat> } | null;
  respuesta: { id: number; persona: PersonaDelChat | null; texto: string | null; borrado: boolean; noDisponible: boolean } | null;
  reacciones: { total: Record<string, number>; mia: string | null };
  editado: string | null;
  borrado: boolean;
  /** Retirado por la moderación: llega sin texto. */
  retirado?: boolean;
  noDisponible: boolean;
  propio: boolean;
  idCliente: string | null;
  creado: string;
  /** Un mensaje temporal: cuándo se borra para todos. */
  caduca?: string | null;
  /** Un susurro: se ve y cuenta como no leído, pero no avisa por push (SDK 1.19). */
  susurro?: boolean;
}

/** Un mensaje programado: solo lo ve quien lo programa, hasta que se envía a su hora. */
export interface ProgramadoDelChat {
  id: number;
  conversacion: number;
  texto: string;
  /** Cuándo se envía (UTC). */
  enviar: string;
  creado: string;
  /** Se enviará como susurro (SDK 1.19). */
  susurro?: boolean;
}

/** Una conversación de la bandeja. */
export interface ConversacionDelChat {
  id: number;
  tipo: "directa" | "grupo" | "web";
  titulo: string | null;
  /** En las directas, la otra persona. */
  persona: PersonaDelChat | null;
  /** En las conversaciones de una web (un club, una campaña), esa web. */
  web: { clave: string; nombre: string } | null;
  miembros: number;
  rol: "miembro" | "admin";
  noLeidos: number;
  ultimoMensaje: MensajeDelChat | null;
  actividad: string;
  cerrada: boolean;
  /** Solo grupos: la descarga de cada persona solo lleva sus mensajes, el push no dice nada y quien entra no ve lo anterior. */
  privacidadAlta?: boolean;
  /** Mensajes temporales: segundos (24 horas, 7 días o 90 días), o `null`. */
  temporal?: number | null;
  permisos: { escribir: boolean; invitar: boolean; administrar: boolean; salir: boolean; borrar: boolean; ajustes?: boolean };
}

/** Una notificación del centro (`docs/publica/ENDPOINTS.md`, «Notificaciones»). */
export interface NotificacionYosiftware {
  id: number;
  /**
   * La web que la emite; `nombre` es «Yosiftware» en las de la plataforma (clave `social`). `icono`, la ruta de su icono
   * cuadrado en la API (`null` en las de la plataforma).
   */
  web: WebDeLaNotificacion;
  /**
   * En las de la plataforma, la web en cuyo nombre avisa (un logro de Libros, un espacio de Fichas): se pinta con su
   * icono en vez del de Yosiftware. `null` si no la hay.
   */
  marca?: WebDeLaNotificacion | null;
  /** En las de tipo `logro.conseguido`: el logro, para pintar el aviso como logro. */
  logro?: LogroDeLaNotificacion | null;
  tipo: { clave: string; nombre: string };
  /** Quien la provoca, si la hay (con el avatar en direcciones completas). */
  actor: PersonaDelChat | null;
  titulo: string;
  cuerpo: string | null;
  /** Su sitio, para abrirlo en otra pestaña (las de la plataforma, en la web social). */
  enlace: string | null;
  botones: { texto: string; enlace: string }[];
  /** Solo en las de la plataforma mientras proceden. */
  acciones: { clave: "aceptar" | "rechazar"; texto: string }[];
  resuelta: string | null;
  cantidad: number;
  creada: string;
  actualizada: string;
  vista: boolean;
  leida: boolean;
  /**
   * La persona oculta que usa la web que la emite: fuera de ella no se enseña (el SDK no la avisa en otra web, y la
   * API no la da ni la cuenta salvo en la vista «Notificaciones» de la web social).
   */
  oculta?: boolean;
}

export interface WebDeLaNotificacion {
  clave: string;
  nombre: string;
  icono?: string | null;
}

export interface LogroDeLaNotificacion {
  /** La clave de la web donde se consiguió. */
  web: string;
  nombre: string;
  nivel: "bronce" | "plata" | "oro" | "platino";
  /** Como llama la web a ese nivel. */
  nombreDelNivel: string;
  /** La ruta de su imagen en la API, si la tiene. */
  imagen: string | null;
  /** El porcentaje de las cuentas de esa web que lo tienen. */
  rareza: number;
  /** Si la campana enseña el aviso en esa web; una web con su propio aviso lo apaga. */
  avisoEnLaWeb: boolean;
}

export interface ContadoresDeNotificaciones {
  /** El de la campana: se pone a cero al abrir el centro. */
  noVistas: number;
  noLeidas: number;
}

export interface PaginaDeNotificaciones extends ContadoresDeNotificaciones {
  notificaciones: NotificacionYosiftware[];
  /** Para la página siguiente; `null` si no hay más. */
  cursor: string | null;
}

export interface OpcionesDeListado {
  cursor?: string | null;
  /** Solo las de esa web (su clave). */
  web?: string | null;
  sinLeer?: boolean;
  /** También las de las webs que la persona oculta (solo vale en la web social, para su vista «Notificaciones»). */
  incluirOcultas?: boolean;
}

/** Una cuenta guardada en este navegador. `sesion` es lo que se pasa a `elegirCuenta()`. */
export interface CuentaGuardada {
  sesion: string;
  cuenta: CuentaYosiftware;
  activa: boolean;
  /** El nombre de su perfil, si tiene; si no, se pinta el alias. */
  nombre: string | null;
  /** La dirección completa de la miniatura de su avatar (64 px), o `null`. */
  avatar: string | null;
}

export interface CuentasGuardadas {
  cuentas: CuentaGuardada[];
  /** Cuántas cuentas caben en un navegador (5). */
  maximo: number;
}

/**
 * Lo que la persona ha pedido cuando el SDK pregunta a la web (`antesDeSalir`, SDK 1.26): cerrar la sesión de esta
 * cuenta (`salir`), la de todas (`salir_de_todas`), activar otra cuenta guardada o abrir las cuentas para elegirla
 * (`cambiar_cuenta`), o abrir el acceso para añadir otra, que pasa a ser la activa (`anadir_cuenta`).
 */
export type MotivoDeSalida = "salir" | "salir_de_todas" | "cambiar_cuenta" | "anadir_cuenta";

export interface SalidaPendiente {
  motivo: MotivoDeSalida;
  /**
   * Hace lo que la persona pidió, sin volver a preguntar: para cuando, después de decir que no, la persona decide en
   * la web (por ejemplo, «Salir sin ellos», o cuando ya se ha subido lo pendiente). Es de la cuenta que preguntó (SDK
   * 1.27): si entretanto ha cambiado, aquí o en otra pestaña o web, no hace nada y rechaza con un error de `name`
   * `"CambioDeIdentidad"`. Al salir, la plataforma solo cierra la sesión si sigue siendo de esa cuenta.
   */
  continuar(): Promise<void>;
}

/** Responde `false` para que el SDK no siga todavía; cualquier otra respuesta, o un error, deja seguir. */
export type PreguntaAntesDeSalir = (salida: SalidaPendiente) => boolean | Promise<boolean>;

/** Los idiomas del SDK (SDK 1.25). */
export type IdiomaDelSdk = "es" | "en" | "pt" | "de";

export interface Yosiftware {
  /** Versión del SDK (`1.x.y`). */
  readonly version: string;
  /** Estado actual de la sesión. */
  readonly estado: EstadoSesion;
  /** Resuelve con el estado en cuanto termina la primera comprobación. */
  listo(): Promise<EstadoSesion>;
  /**
   * Llama al oyente ahora y en cada cambio de sesión. Después de cada `yosiftware:identidad`, avisa siempre una vez
   * con el estado confirmado, aunque sea la misma cuenta que antes (SDK 1.28). Si una renovación encuentra otra
   * cuenta sin aviso previo, el SDK manda antes `yosiftware:identidad`, y después llega aquí la cuenta nueva (SDK 1.30).
   * Devuelve la función para dejar de escuchar.
   */
  alCambiar(oyente: (estado: EstadoSesion) => void): () => void;
  /** Abre el acceso de Yosiftware sobre la web. Resuelve `true` si al cerrarse hay sesión. */
  entrar(opciones?: OpcionesDeEntrada): Promise<boolean>;
  /**
   * Cierra la sesión central: en esta web y en todas las demás. Cierra la de la cuenta que esta pestaña tiene: si otra
   * pestaña o web acaba de cambiar a otra, no la cierra y rechaza con un error de `name` `"CambioDeIdentidad"` (SDK
   * 1.27). Antes de rechazar, avisa con `yosiftware:identidad` y comprueba la sesión, sin esperar al canal: después llega por
   * `alCambiar` la cuenta que hay ahora (SDK 1.29). Como `salirDeTodas()`, avisa primero con `yosiftware:identidad` y después llega `sin_sesion` por `alCambiar`.
   */
  salir(): Promise<void>;
  /** Abre las cuentas guardadas del navegador; el cambio se aplica a todas las webs abiertas. */
  cambiarCuenta(): Promise<boolean>;
  /**
   * Las cuentas guardadas en este navegador (hasta `maximo`), con la activa marcada, para montar un selector de
   * cuentas propio (SDK 1.21; el de `<yosi-acceso>` ya lo hace). `null` si no hay ninguna.
   */
  cuentasGuardadas(): Promise<CuentasGuardadas | null>;
  /**
   * Activa una cuenta guardada en todas las webs abiertas, sin cerrar las demás. Si su sesión ha caducado, abre el
   * acceso para volver a entrar con ella. Resuelve `true` si al terminar hay sesión.
   */
  elegirCuenta(sesion: string): Promise<boolean>;
  /** Abre el acceso para añadir otra cuenta sin cerrar las guardadas. Resuelve `true` si se ha añadido. */
  anadirCuenta(): Promise<boolean>;
  /**
   * Sale de todas las cuentas guardadas en este navegador, en esta web y en todas las demás. Avisa primero con
   * `yosiftware:identidad` y después llega `sin_sesion` por `alCambiar` (SDK 1.27; antes, al revés).
   */
  salirDeTodas(): Promise<void>;
  /**
   * Pide que se pregunte a la web antes de cerrar la sesión o cambiar de cuenta desde esta pestaña (SDK 1.26, kit
   * 1.71), por ejemplo para avisar de trabajo sin subir. Vale para el panel de `<yosi-acceso>` y para `salir()`,
   * `salirDeTodas()`, `elegirCuenta()`, `cambiarCuenta()` y `anadirCuenta()`, solo con sesión. Si la pregunta responde
   * `false`, el SDK no hace nada (el panel se cierra) y la web llama a `continuar()` cuando la persona decida. Nunca
   * impide salir: si no responde en 5 segundos, sale; y si ha dicho que no hace menos de 60 segundos, la siguiente vez
   * sale sin preguntar. No se pregunta cuando la sesión se cierra fuera de esta pestaña (otra web, otra pestaña, una
   * revocación o la caducidad): eso se sigue sabiendo después, con `yosiftware:identidad` y `alCambiar`. Hay una sola
   * pregunta por página: la nueva sustituye a la anterior, y `null` la quita. Devuelve la función para quitarla.
   */
  antesDeSalir(pregunta: PreguntaAntesDeSalir | null): () => void;
  /**
   * Enseña las normas propias de esta web, si faltan por aceptar (SDK 1.31, kit 1.78), para pedirlas cuando hacen falta
   * (por ejemplo, al pulsar «Nuevo personaje») en vez de al entrar. Resuelve `true` si ya estaban aceptadas, si la web
   * no tiene o si la persona las acepta ahora: entonces los tokens ya vienen renovados, sin `normasPendientes`.
   * Resuelve `false` sin sesión o si la persona pulsa «Ahora no». Con `motivo`, la ventana empieza por esa frase de la
   * web («Para crear en Rol necesitas aceptar sus normas.»). Para que el SDK no las enseñe solo al entrar, pon
   * `data-normas="al-crear"` en la etiqueta del SDK; sin ella, las sigue enseñando al entrar, como siempre.
   */
  normasDeLaWeb(opciones?: OpcionesDeNormasDeLaWeb): Promise<boolean>;
  /**
   * Abre el recordatorio de confirmar el correo de la cuenta (SDK 1.32): el código de 6 cifras que llega al correo, el
   * plazo antes de que la cuenta se borre y «Ahora no». El SDK ya lo abre solo cuando toca (al entrar y, como mínimo, una
   * vez al día); llámalo cuando la persona quiera confirmarlo, o cuando una ruta responda `403 correo_sin_confirmar`.
   * Resuelve `true` si lo confirma: entonces la sesión ya viene renovada, con `correoVerificado: true`. Resuelve `false`
   * sin sesión, si ya estaba confirmado o si la persona pulsa «Ahora no» o cierra la ventana.
   */
  confirmarCorreo(): Promise<boolean>;
  /**
   * Abre el formulario de errores y propuestas de Yosiftware sobre la web (si no hay sesión, antes el acceso).
   * La web de origen y la página se rellenan solas. Resuelve `true` si se ha enviado un reporte.
   */
  reportar(opciones?: OpcionesDeReporte): Promise<boolean>;
  /**
   * Abre la ventana para denunciar una persona, un mensaje del chat, una novedad o un comentario de la plataforma
   * (si no hay sesión, antes el acceso). Resuelve `true` si se ha enviado la denuncia. Lo propio de la web (sus
   * reseñas, sus fichas) lo modera la web: ver `MODERACION.md`.
   */
  denunciar(objeto: ObjetoDeDenuncia): Promise<boolean>;
  /**
   * Abre la privacidad de Yosiftware para esta web en un diálogo (lo mismo que la tecla `<yosi-privacidad>`): sin
   * sesión, qué se guarda de quien la usa sin cuenta; con sesión, ocultar que se usa y qué llega al móvil. Con
   * `{ recorrido: true }`, el recorrido guiado (que el SDK ya enseña solo una vez por cuenta). Resuelve al cerrarse.
   */
  privacidad(opciones?: OpcionesDePrivacidad): Promise<void>;
  /**
   * El idioma en el que el SDK pinta sus botones, paneles y ventanas (SDK 1.25, kit 1.68): `es`, `en`, `pt` o `de`.
   * Por defecto es el de la web, `<html lang>` (su primera parte: `de-AT` es `de`), y cambia al momento si la web lo
   * cambia; uno que no está entre esos cuatro, en español. Con un valor, lo fuerza por encima del de la web, y con
   * `null` vuelve a seguir a la web. Devuelve el idioma resultante. Cada cambio se avisa en `window` con
   * `yosiftware:idioma` (`detail: { idioma }`). Se traducen los botones y paneles que el SDK pinta en la web
   * (`<yosi-acceso>` y su panel de cuentas, `<yosi-webs>`, `<yosi-privacidad>`, `<yosi-reportar>` y las normas
   * pendientes). Siguen en español la ventana del acceso (entrar, la cuenta, errores y propuestas, denunciar), que es una
   * página de la plataforma, los errores de la API, los textos legales y, por ahora, el chat, las notificaciones, los
   * espacios y los encargos.
   */
  idioma(valor?: string | null): IdiomaDelSdk;
  /**
   * La hoja de estilos propia de la web (SDK 1.14, `ecosistema-kit/ESTILOS.md`): una dirección (relativa a la página o
   * absoluta) o `{ css }` con el texto, de 64 KB como mucho. El SDK la aplica dentro de todos sus elementos, también los
   * que se creen después, y la manda a sus ventanas (entrar, perfil, reportar, denunciar), encima de sus propios
   * estilos. Se escribe con los nombres de las piezas (`[part~="boton"][part~="principal"]`). Otra llamada la
   * sustituye y `null` la quita. Sin JS: `data-estilos="/ruta.css"` en la etiqueta del SDK. Rechaza si no se puede
   * cargar o es demasiado grande.
   */
  estilos(hoja: string | { css: string } | null): Promise<void>;
  /**
   * Abre la vista de perfil de Yosiftware sobre la web (si no hay sesión, antes el acceso): el avatar y todos los
   * campos del perfil común. Resuelve `true` si se ha guardado algo.
   */
  editarPerfil(): Promise<boolean>;
  /** El perfil propio, con el avatar. `null` sin sesión. */
  perfil(): Promise<PerfilPropio | null>;
  /** El bloque de ajustes de esta web para la cuenta. */
  readonly ajustes: {
    /** Lee el bloque. `null` sin sesión. */
    leer(): Promise<AjustesDeLaWeb | null>;
    /**
     * Guarda cambios por claves de primer nivel sobre lo último guardado y devuelve el bloque resultante. Sin
     * `version`, lee antes la vigente y, si otro dispositivo guarda entre medias, lo repite una vez sobre lo
     * último; con ella, un conflicto lanza un error con `code: "ajustes_desactualizados"`. `null` sin sesión.
     */
    guardar(cambios: CambiosDeAjustes, version?: number): Promise<AjustesDeLaWeb | null>;
  };
  /**
   * Token de acceso para la API de esta web (con su audiencia), renovado si hace falta. `null` sin sesión o
   * si la web no tiene API registrada. Nunca lo guardes ni lo pases a otra web.
   */
  token(): Promise<string | null>;
  /** Token de acceso para la API de la plataforma (`aud: cuentas`). `null` sin sesión. */
  tokenPlataforma(): Promise<string | null>;
  /**
   * El tiempo real: un socket por pestaña con el gateway de la plataforma, que entrega los eventos de la persona
   * (y, con los componentes del chat y las notificaciones, lo que ellos necesitan). Se abre solo cuando hay sesión
   * y alguien escucha, y se cierra al salir. La web tiene que permitir el gateway en `connect-src`
   * (`ecosistema-kit/ACCESO.md`).
   */
  readonly tiempoReal: {
    readonly estado: EstadoTiempoReal;
    /** Llama al oyente con cada evento. Devuelve la función para dejar de escuchar. */
    alEvento(oyente: (evento: EventoTiempoReal) => void): () => void;
    /** Llama al oyente ahora y en cada cambio de estado de la conexión. */
    alCambiar(oyente: (estado: EstadoTiempoReal) => void): () => void;
    /** Pide al gateway lo que haya pendiente (por ejemplo, al volver a la pestaña). */
    sincronizar(): void;
    /**
     * Llama al oyente con cada aviso efímero («escribiendo…» en una conversación, una amistad que se conecta o se
     * desconecta). Abre la conexión como `alEvento`. Devuelve la función para dejar de escuchar.
     */
    alAviso(oyente: (aviso: AvisoTiempoReal) => void): () => void;
  };
  /**
   * El chat de Yosiftware. La ventana flotante con sus burbujas la pone `<yosi-chat>`; las webs que hacen del chat
   * parte de su página colocan `<yosi-chat-bandeja>` y `<yosi-chat-conversacion>` donde quieran
   * (`ecosistema-kit/CHAT.md`). Todo funciona sin sesión: lo que lo necesita resuelve `null`.
   */
  readonly chat: {
    /** Conversaciones con mensajes sin leer más invitaciones a grupos pendientes (para un contador). */
    readonly noLeidos: number;
    /** Llama al oyente ahora y cada vez que cambia `noLeidos`. Devuelve la función para dejar de escuchar. */
    alCambiarNoLeidos(oyente: (noLeidos: number) => void): () => void;
    /** La bandeja: las conversaciones, la de actividad más reciente primero. `null` sin sesión. */
    conversaciones(): Promise<ConversacionDelChat[] | null>;
    /**
     * La conversación directa con una amistad (la crea si no existía) y su id. `null` sin sesión. Lanza un error
     * con `code: "solo_entre_amistades"` si no sois amistades.
     */
    directa(idCuenta: string): Promise<number | null>;
    /**
     * Abre en la ventana flotante (`<yosi-chat>`, si la página lo tiene) el listado o una conversación. Devuelve
     * `false` si la página no tiene `<yosi-chat>`.
     */
    abrir(idConversacion?: number): boolean;
    /** Avisa a quienes están en la conversación de que se está escribiendo (como mucho uno cada 3 s). */
    escribiendo(idConversacion: number): void;
  };
  /**
   * Las notificaciones de Yosiftware. La campana con el centro y los avisos emergentes los pone
   * `<yosi-notificaciones>`; la lista completa, `<yosi-notificaciones-lista>` (`ecosistema-kit/NOTIFICACIONES.md`).
   * Sin sesión, lo que la necesita resuelve `null`.
   */
  /**
   * Los espacios de la persona en esta web (`ecosistema-kit/ESPACIOS.md`). Todo son llamadas a la API pública con el
   * token de la plataforma: una web con su propio front puede hacerlas ella misma. Sin sesión, resuelven `null`.
   * Las llamadas que fallan lanzan un error con `code` (`docs/publica/ERRORES.md`).
   */
  readonly espacios: {
    mios(): Promise<EspacioDeYosiftware[] | null>;
    espacio(id: number): Promise<EspacioDeYosiftware | null>;
    miembros(id: number): Promise<MiembroDeEspacio[] | null>;
    /** Las invitaciones pendientes de la persona en esta web. */
    invitaciones(): Promise<InvitacionAEspacio[] | null>;
    /** La invitación del enlace de un correo (lo que va tras `#yosi-invitacion=`), si es para esta persona. */
    porCodigo(codigo: string): Promise<InvitacionAEspacio | null>;
    invitar(id: number, a: { cuenta: string } | { correo: string }, rol?: string): Promise<unknown>;
    aceptar(idInvitacion: number): Promise<EspacioDeYosiftware | null>;
    aceptarPorCodigo(codigo: string): Promise<EspacioDeYosiftware | null>;
    rechazar(idInvitacion: number): Promise<void>;
    /**
     * Abre el canal de tiempo real de un espacio (lo que publica el backend de la web, la presencia). Lo perdido al
     * reconectar llega solo, en orden; con `desde`, a partir de ese número de orden.
     */
    canal(id: number, oyente: (mensaje: MensajeDelCanal) => void, opciones?: { desde?: number }): CanalDeEspacio;
    /**
     * La ventana de la plataforma para aceptar o rechazar: la del código de un correo, o las pendientes en esta web.
     * El SDK la abre solo con `#yosi-invitacion=<código>` o `#yosi-invitaciones` en la dirección, salvo con
     * `data-invitaciones="propias"` en su etiqueta.
     */
    verInvitaciones(opciones?: { codigo?: string }): Promise<void>;
  };
  /**
   * Los encargos entre webs (`ecosistema-kit/ENCARGOS.md`, SDK 1.23): pedir a otra web que cree algo para la persona
   * y recibirlo, o hacer en esta lo que otra pide. Los botones los ponen `<yosi-encargos>` (en la web que pide) y
   * `<yosi-encargo>` (en la que lo hace). Sin sesión, resuelven `null`; los errores llevan `code`.
   */
  readonly encargos: {
    /** Las webs que aceptan encargos de un tipo, sin esta. */
    servicios(tipo?: string): Promise<ServicioDeEncargo[] | null>;
    /**
     * Pide un encargo y lo abre en una pestaña nueva (llámalo al pulsar un botón, para que el navegador lo deje).
     * Si no la ha podido abrir, `abierto` es `false`: ofrece un enlace a `encargo.abrir`.
     */
    encargar(pedido: PedidoDeEncargo): Promise<{ encargo: EncargoDeYosiftware; abierto: boolean } | null>;
    ver(id: string): Promise<EncargoDeYosiftware | null>;
    /** Los de la persona en esta web; `{ papel: "origen", estado: "entregado" }` es lo que queda por recoger. */
    listar(filtro?: { papel?: "origen" | "destino"; estado?: EncargoDeYosiftware["estado"] }): Promise<EncargoDeYosiftware[] | null>;
    /** Lo entregado, en orden (WebP). La web de origen lo guarda y después llama a `recoger()`. */
    imagenes(id: string): Promise<Blob[] | null>;
    /** Un archivo: la referencia (`numero` 1) o una imagen entregada. */
    archivo(id: string, papel: "referencia" | "entrega", numero: number): Promise<Blob | null>;
    ponerReferencia(id: string, imagen: Blob): Promise<EncargoDeYosiftware | null>;
    /** La web de destino entrega lo hecho, de 1 al máximo pedido. */
    entregar(id: string, imagenes: Blob[]): Promise<EncargoDeYosiftware | null>;
    /** La web de origen ya lo ha guardado: la plataforma lo borra. */
    recoger(id: string): Promise<EncargoDeYosiftware | null>;
    cancelar(id: string): Promise<EncargoDeYosiftware | null>;
    /** Cada cambio de un encargo en el que esta web es origen o destino. Devuelve la función para dejar de escuchar. */
    alCambiar(oyente: (cambio: CambioDeEncargo) => void): () => void;
    /** El encargo con el que se ha abierto la página (`?encargo=<id>`), o `null`. */
    delEnlace(): string | null;
    /** Quita `?encargo=` de la dirección sin recargar. */
    olvidarEnlace(): void;
  };
  readonly notificaciones: {
    readonly contadores: ContadoresDeNotificaciones;
    /** Llama al oyente ahora y cada vez que cambian los contadores. Devuelve la función para dejar de escuchar. */
    alCambiarContadores(oyente: (contadores: ContadoresDeNotificaciones) => void): () => void;
    /** Llama al oyente con cada notificación nueva que llega por el tiempo real (para un aviso propio). */
    alLlegar(oyente: (notificacion: NotificacionYosiftware) => void): () => void;
    listar(opciones?: OpcionesDeListado): Promise<PaginaDeNotificaciones | null>;
    /** Al abrir un centro propio: todas vistas (el contador de la campana a cero). */
    marcarVistas(): Promise<void>;
    marcarLeida(id: number): Promise<void>;
    marcarTodasLeidas(): Promise<void>;
  };
  /**
   * `fetch` con `Authorization: Bearer <token()>`. Si la API responde 401, renueva el token y lo repite una
   * vez.
   */
  fetch(entrada: string | URL | Request, opciones?: RequestInit): Promise<Response>;
}

export declare const yosiftware: Yosiftware;

declare global {
  interface Window {
    yosiftware: Yosiftware;
  }
  interface WindowEventMap {
    /** Cada cambio de sesión, con el estado nuevo en `detail`. */
    "yosiftware:sesion": CustomEvent<EstadoSesion>;
    /** Se ha aceptado o rechazado una invitación desde la ventana del SDK. */
    "yosiftware:espacio": CustomEvent<EventoDeEspacio>;
  }
  interface HTMLElementEventMap {
    /** `<yosi-chat-bandeja>`: se ha elegido una conversación. */
    "yosi-chat-seleccion": CustomEvent<{ conversacion: number }>;
    /** `<yosi-chat-conversacion>`: la persona ya no está en la conversación (ha salido, la han sacado o se ha borrado). */
    "yosi-chat-fuera": CustomEvent<{ conversacion: number }>;
    /** Se pulsa una notificación o uno de sus botones. Cancelable: si nadie lo cancela, se abre `enlace` en otra pestaña. */
    "yosi-notificacion-abrir": CustomEvent<{ notificacion: NotificacionYosiftware; enlace: string }>;
    /** «Ver todas» en el centro. Cancelable: si nadie lo cancela, abre la lista en la web social. */
    "yosi-notificaciones-ver-todas": CustomEvent<null>;
    /** «Preferencias» en el centro. Cancelable: si nadie lo cancela, abre las preferencias en la web social. */
    "yosi-notificaciones-preferencias": CustomEvent<null>;
    /** `<yosi-encargos>`: se ha pedido un encargo (y abierto su pestaña). */
    "yosi-encargo-pedido": CustomEvent<{ encargo: EncargoDeYosiftware }>;
    /** `<yosi-encargos>`: ha llegado lo pedido. Lee `yosiftware.encargos.imagenes()`, guárdalo y llama a `recoger()`. */
    "yosi-encargo-entregado": CustomEvent<{ encargo: EncargoDeYosiftware }>;
    /** `<yosi-encargos>` o `<yosi-encargo>`: la persona ha cancelado el encargo. */
    "yosi-encargo-cancelado": CustomEvent<{ encargo: string }>;
    /** `<yosi-encargo>`: hay un encargo pendiente para esta web; usa sus `indicaciones`. */
    "yosi-encargo-abierto": CustomEvent<{ encargo: EncargoDeYosiftware }>;
    /** `<yosi-encargo>`: se ha enviado lo elegido a la web de origen. */
    "yosi-encargo-enviado": CustomEvent<{ encargo: EncargoDeYosiftware }>;
    /** `<yosi-encargo>`: la persona ha cerrado el aviso de un encargo que ya no está abierto. */
    "yosi-encargo-cerrado": CustomEvent<{ encargo: string | null }>;
  }
  interface HTMLElementTagNameMap {
    /** Botón de la cuenta: «Entrar» sin sesión; con ella, el avatar, que abre el panel de cuentas (SDK 1.21). */
    "yosi-acceso": HTMLElement;
    /**
     * El botón de las webs del ecosistema (SDK 1.21), obligatorio en la cabecera: la cuadrícula abre las webs y las
     * apps, con su icono. `nueva-pestana` las abre en otra pestaña.
     */
    "yosi-webs": HTMLElement;
    /** Botón que abre el formulario de errores y propuestas. Admite `tipo="error"` o `tipo="propuesta"`. */
    "yosi-reportar": HTMLElement;
    /** Botón que abre la vista de perfil de la plataforma. */
    "yosi-perfil": HTMLElement;
    /** La ventana de las invitaciones a espacios (la abre el SDK). */
    "yosi-invitacion-espacio": HTMLElement;
    /** La ventana de una web en pruebas privadas a la que la cuenta no tiene acceso (la abre el SDK). */
    "yosi-web-privada": HTMLElement;
    /** El chat flotante: el botón con el contador, el listado, hasta cinco ventanas y las burbujas. */
    "yosi-chat": HTMLElement;
    /**
     * La bandeja del chat para incrustarla en la página: invitaciones, buscar y empezar conversaciones. Al elegir
     * una lanza `yosi-chat-seleccion` (`detail.conversacion`); `seleccionada="<id>"` la marca.
     */
    "yosi-chat-bandeja": HTMLElement;
    /**
     * La campana con el contador de no vistas, el centro desplegable y los avisos emergentes de las que llegan
     * (`sin-avisos` los quita). Al pulsar una notificación lanza `yosi-notificacion-abrir`, cancelable; si nadie lo
     * cancela, abre su enlace en otra pestaña.
     */
    "yosi-notificaciones": HTMLElement;
    /** La lista completa de notificaciones, con filtros por web y por leídas, para una página propia. */
    "yosi-notificaciones-lista": HTMLElement;
    /**
     * Una conversación para incrustarla en la página (`conversacion="<id>"`): mensajes, respuestas, reacciones,
     * edición, «escribiendo…», leídos y los detalles del grupo. `detalles` abre el panel de detalles.
     */
    "yosi-chat-conversacion": HTMLElement;
    /**
     * El botón de la web que pide un encargo (SDK 1.23): «Generar con p.i.c.» con las webs que aceptan `tipo`;
     * mientras se hace, «Abierto en p.i.c.»; al llegar, lanza `yosi-encargo-entregado`. Atributos `tipo`, `titulo`,
     * `maximo`, `id-externo` y `volver`; propiedades `indicaciones` y `referencia`.
     */
    "yosi-encargos": HTMLElement & { indicaciones: Record<string, unknown> | null; referencia: Blob | null; readonly encargo: EncargoDeYosiftware | null; cargar(): Promise<void> };
    /**
     * El aviso del encargo en la web que lo hace (SDK 1.23), con `id-encargo` o `?encargo=` en la dirección: de quién
     * es, qué pide y «Enviar 2 a Rol». La web pone en `imagenes` lo que la persona elige enviar.
     */
    "yosi-encargo": HTMLElement & { imagenes: Blob[]; readonly encargo: EncargoDeYosiftware | null; cargar(): Promise<void> };
  }
}
