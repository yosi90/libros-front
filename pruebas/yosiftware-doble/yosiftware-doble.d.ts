// Generado por `npm run doble` (sdk/scripts/generar-doble.mjs) desde `sdk/src/doble/doble.ts`: no lo edites.
/**
 * El doble del SDK para las pruebas de las webs (kit 1.85, petición de Libros): un `window.yosiftware` sin plataforma,
 * sin red y sin dependencias, que se comporta como el SDK en lo que una web prueba. Tiene la sesión y sus avisos (en el
 * orden de `CAMBIO_DE_CUENTA.md`), las cuentas guardadas, los tokens de cada cuenta, los ajustes con su versión y su
 * conflicto, el tiempo real, y los canales y las listas de los espacios. Lo demás (chat, notificaciones, encargos,
 * ventanas) responde lo que la prueba le diga y apunta cada llamada.
 *
 * Implementa la interfaz pública del SDK (`yosiftware.d.ts`): si el SDK cambia y el doble no, deja de compilar. Su
 * `version` es la del SDK que imita. Guía en `ecosistema-kit/PRUEBAS.md`.
 */
import type { AjustesDeLaWeb, AvisoTiempoReal, CambioDeEncargo, CambiosDeAjustes, ContadoresDeNotificaciones, ConversacionDelChat, CuentaGuardada, CuentaYosiftware, EncargoDeYosiftware, EspacioDeYosiftware, EstadoSesion, EstadoTiempoReal, EventoTiempoReal, InvitacionAEspacio, MensajeDelCanal, MiembroDeEspacio, NormasPendientesDeLaWeb, NotificacionYosiftware, PaginaDeNotificaciones, PerfilPropio, Restricciones, ServicioDeEncargo, Yosiftware } from "./yosiftware";
/** Una cuenta para el doble: solo `id` es obligatorio; lo demás toma un valor de ejemplo. */
export type CuentaDelDoble = Partial<CuentaYosiftware> & {
    id: string;
};
/** Lo que acompaña a una sesión: lo limitado y las normas propias pendientes. */
export interface ExtrasDeSesion {
    restricciones?: Restricciones;
    normasPendientes?: NormasPendientesDeLaWeb;
}
export interface OpcionesDelDoble extends ExtrasDeSesion {
    /** Con quién empieza: una cuenta (con sesión) o `null` (sin sesión, por defecto). */
    cuenta?: CuentaDelDoble | null;
    /** Otras cuentas guardadas en el navegador, para `elegirCuenta()` y `cambiarCuenta()`. */
    guardadas?: CuentaDelDoble[];
    /** Empieza en `comprobando`, hasta `control.terminarComprobacion()`: para probar lo que la web pinta mientras. */
    comprobando?: boolean;
    /** La web no tiene API registrada: `token()` da `null`. */
    sinApi?: boolean;
    /** Donde se lanzan `yosiftware:sesion`, `yosiftware:identidad`, `yosiftware:idioma`… Por defecto, `globalThis`. */
    ventana?: EventTarget;
    /** El `fetch` de `yosiftware.fetch()`. Por defecto, el de `globalThis`. */
    fetch?: typeof fetch;
}
/** Lo que piden las ventanas del SDK (entrar, añadir otra cuenta, las normas…): la prueba decide qué responde. */
export interface RespuestasDelDoble {
    /** `entrar()`: la cuenta con la que se entra, o `null` si se cierra el acceso. Por defecto, `null`. */
    entrar: () => CuentaDelDoble | null | Promise<CuentaDelDoble | null>;
    /** `anadirCuenta()`: la cuenta añadida, o `null`. Por defecto, `null`. */
    anadirCuenta: () => CuentaDelDoble | null | Promise<CuentaDelDoble | null>;
    /** `cambiarCuenta()`: la `sesion` de la guardada que se elige, o `null`. Por defecto, la primera que no es la activa. */
    cambiarCuenta: (guardadas: CuentaGuardada[]) => string | null | Promise<string | null>;
    /** `normasDeLaWeb()` con normas pendientes: si las acepta. Por defecto, `true`. */
    normasDeLaWeb: () => boolean | Promise<boolean>;
    /** `confirmarCorreo()` con el correo sin confirmar: si lo confirma. Por defecto, `false` («Ahora no»). */
    confirmarCorreo: () => boolean | Promise<boolean>;
    /** `reportar()`, `denunciar()` y `editarPerfil()`: si se envía o se guarda. Por defecto, `false`. */
    reportar: () => boolean | Promise<boolean>;
    denunciar: () => boolean | Promise<boolean>;
    editarPerfil: () => boolean | Promise<boolean>;
}
/** Una llamada que el doble ha apuntado: el método (`"reportar"`, `"espacios.invitar"`…) y sus argumentos. */
export interface LlamadaAlDoble {
    metodo: string;
    argumentos: unknown[];
}
/** Lo que la prueba maneja: el estado, lo que llega de fuera y lo que la web ha pedido. */
export interface ControlDelDoble {
    readonly estado: EstadoSesion;
    /** Lo que el doble responde cuando la web abre una ventana del SDK. */
    readonly respuestas: RespuestasDelDoble;
    /** Cada llamada a algo que el SDK haría en la plataforma o en una ventana, en orden. */
    readonly llamadas: LlamadaAlDoble[];
    /** Las llamadas de un método (`"reportar"`, `"espacios.invitar"`…). */
    llamadasA(metodo: string): unknown[][];
    /** Termina la primera comprobación (con `comprobando: true`): con esta cuenta o sin sesión. */
    terminarComprobacion(cuenta?: CuentaDelDoble | null, extras?: ExtrasDeSesion): void;
    /**
     * Hay sesión con esta cuenta, como al entrar o al renovar. Si había otra, llega antes `yosiftware:identidad`, como
     * cuando una renovación encuentra otra cuenta (SDK 1.30). Desde sin sesión, solo el estado nuevo.
     */
    iniciarSesion(cuenta: CuentaDelDoble, extras?: ExtrasDeSesion): void;
    /**
     * El cambio viene de otra pestaña o de otra web (el canal de sesión): siempre `yosiftware:identidad` y después el
     * estado confirmado, aunque sea la misma cuenta (SDK 1.28). Con `null`, la otra pestaña ha salido.
     */
    cambioDesdeOtraPestana(cuenta: CuentaDelDoble | null, extras?: ExtrasDeSesion): void;
    /** La sesión ha caducado o la han revocado sin aviso previo: solo `sin_sesion`, sin `yosiftware:identidad`. */
    sesionCaducada(): void;
    /** La cuenta se ha borrado: `yosiftware:identidad` y `sin_sesion`, y sale de las guardadas. */
    cuentaBorrada(): void;
    /** Hay una versión importante de las normas de uso sin aceptar: `sin_sesion` con `motivo: "normas_pendientes"`. */
    normasDeUsoPendientes(): void;
    /** La plataforma no responde: `no_disponible`. */
    noDisponible(): void;
    /** Cambia lo limitado o las normas pendientes de la cuenta activa (como al renovar): llega por `alCambiar`. */
    cambiarExtras(extras: ExtrasDeSesion): void;
    /** Los tokens de una cuenta. Por defecto, `doble-api.<id>` y `doble-plataforma.<id>`. */
    ponerTokens(idCuenta: string, tokens: {
        api?: string | null;
        plataforma?: string;
    }): void;
    /** Los ajustes de una cuenta en esta web (por defecto, `{ version: 1, documento: {} }`). */
    ponerAjustes(idCuenta: string, documento: Record<string, unknown>, version?: number): void;
    /** Otro dispositivo guarda antes: sube la versión, para probar el conflicto de `guardar(cambios, version)`. */
    guardarDesdeOtroDispositivo(cambios: CambiosDeAjustes, idCuenta?: string): AjustesDeLaWeb;
    /** Los ajustes guardados de una cuenta (la activa, sin `idCuenta`). */
    ajustesDe(idCuenta?: string): AjustesDeLaWeb | null;
    /** El perfil propio de una cuenta (por defecto, uno mínimo con su alias). */
    ponerPerfil(idCuenta: string, perfil: Partial<PerfilPropio>): void;
    /** Un evento del tiempo real, con su secuencia: llega a `tiempoReal.alEvento` si hay sesión. */
    emitir(tipo: string, datos?: Record<string, unknown> | null): EventoTiempoReal | null;
    /** Un aviso efímero («escribiendo…», presencia): llega a `tiempoReal.alAviso` si hay sesión. */
    avisar(aviso: AvisoTiempoReal): void;
    /** Fuerza el estado de la conexión del tiempo real (`null` vuelve al calculado: conectado si hay sesión y oyentes). */
    estadoTiempoReal(estado: EstadoTiempoReal | null): void;
    /** Los espacios de la persona en esta web, sus miembros y sus invitaciones pendientes. */
    ponerEspacios(espacios: EspacioDeYosiftware[]): void;
    ponerMiembros(idEspacio: number, miembros: MiembroDeEspacio[]): void;
    ponerInvitaciones(invitaciones: InvitacionAEspacio[]): void;
    /** La invitación del enlace de un correo (`porCodigo`, `aceptarPorCodigo`). */
    ponerInvitacionPorCodigo(codigo: string, invitacion: InvitacionAEspacio): void;
    /** Lo que publica el backend en el canal de un espacio: llega a los canales abiertos y queda para `desde`. */
    publicarEnCanal(idEspacio: number, idExterno: string, datos: Record<string, unknown>): MensajeDelCanal;
    /** Cualquier otro mensaje del canal (`presencia`, `desfase`, `cerrado`, `error`). */
    enviarAlCanal(idEspacio: number, mensaje: MensajeDelCanal): void;
    /** Quién tiene el espacio abierto (sale en `abierto` y en `presencia`). */
    ponerPresentes(idEspacio: number, cuentas: string[]): void;
    /** Cuántos canales tiene abiertos la web en ese espacio. */
    canalesAbiertos(idEspacio: number): number;
    ponerNoLeidos(noLeidos: number): void;
    ponerConversaciones(conversaciones: ConversacionDelChat[]): void;
    /** La conversación directa con una cuenta (`chat.directa`); sin ella, `solo_entre_amistades`. */
    ponerDirecta(idCuenta: string, idConversacion: number): void;
    ponerContadores(contadores: ContadoresDeNotificaciones): void;
    ponerNotificaciones(pagina: PaginaDeNotificaciones): void;
    /** Una notificación nueva por el tiempo real: llega a `notificaciones.alLlegar`. */
    notificar(notificacion: NotificacionYosiftware): void;
    ponerServicios(servicios: ServicioDeEncargo[]): void;
    ponerEncargos(encargos: EncargoDeYosiftware[]): void;
    /** Un encargo ha cambiado: llega a `encargos.alCambiar`. */
    cambioDeEncargo(cambio: CambioDeEncargo): void;
}
export interface DobleYosiftware {
    /** Lo que la web usa como `window.yosiftware`. */
    readonly yosiftware: Yosiftware;
    /** Lo que maneja la prueba. */
    readonly control: ControlDelDoble;
}
export declare function crearDobleYosiftware(opciones?: OpcionesDelDoble): DobleYosiftware;
/**
 * Pone el doble en `window.yosiftware` (y su control en `window.yosiftwareDoble`), como el SDK al cargarse: para una
 * página entera, en Playwright o en una prueba con DOM. Si ya había uno, lo sustituye.
 */
export declare function instalarDobleYosiftware(opciones?: OpcionesDelDoble): DobleYosiftware;
export declare const VERSION: string;
