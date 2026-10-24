package es.yosiftware.sesion

import org.json.JSONObject

/**
 * En qué punto está la sesión. La app pinta una pantalla por estado y llama a las acciones de [SesionYosiftware].
 * Cada estado corresponde a un caso de `ecosistema-kit/APK.md`.
 */
sealed interface EstadoSesion {
    /** Al arrancar, mientras se comprueba la sesión guardada. */
    data object Comprobando : EstadoSesion

    /** Sin sesión: la pantalla de entrar. Con [motivo] si la plataforma la ha cerrado (enséñalo). */
    data class SinSesion(val motivo: Motivo? = null) : EstadoSesion

    /** Hay una sesión guardada, pero no se ha podido comprobar (sin red). [SesionYosiftware.reintentar]. */
    data class SinConexion(val motivo: Motivo) : EstadoSesion

    /** Cuenta nueva: pide un alias, enseña las normas de uso y llama a [SesionYosiftware.completarAlta]. */
    data class AltaRequerida(val normasUso: ResumenNormas) : EstadoSesion

    /** Pide el código de la app de autenticación, o uno de recuperación: [SesionYosiftware.enviarCodigo]. */
    data object SegundoFactorRequerido : EstadoSesion

    /**
     * Falta confirmar el correo ([motivo] `verificacion`) o vincular una forma de acceso nueva a una cuenta que ya
     * existe (`vinculacion`). La app no lo hace: abre [direccion] en el navegador del sistema y, al volver, la persona
     * entra otra vez.
     */
    data class AbrirEnNavegador(val motivo: String, val direccion: String) : EstadoSesion

    /** La cuenta tiene el borrado pedido. Enseña [borrarDesde] y ofrece [SesionYosiftware.conservarCuenta]. */
    data class BorradoProgramado(val pedido: String?, val borrarDesde: String?) : EstadoSesion

    /** Hay una versión importante de las normas de uso sin aceptar, y no hay tokens hasta aceptarla. */
    data class NormasDeUsoPendientes(val normas: ResumenNormas, val cuenta: Cuenta?) : EstadoSesion

    /**
     * Con sesión. Si [normasPendientes] no es `null`, faltan las normas propias de la web: enséñalas
     * ([SesionYosiftware.leerNormasDeLaWeb]) y acéptalas ([SesionYosiftware.aceptarNormasDeLaWeb]) antes de seguir.
     */
    data class ConSesion(val cuenta: Cuenta, val normasPendientes: ResumenNormas?) : EstadoSesion
}

/** Por qué se cerró la sesión o no se pudo comprobar: el `code` y la frase para la persona. */
data class Motivo(val codigo: String, val mensaje: String)

data class Cuenta(
    val id: String,
    val alias: String,
    val correo: String?,
    val correoVerificado: Boolean,
    val estado: String,
    /** Cuenta del propietario del ecosistema (`ecosistema-kit/APK.md`, Yosiftadísticas). */
    val propietario: Boolean,
)

/**
 * La sesión de Yosiftware de otra app del ecosistema de este móvil ([SesionYosiftware.sesionesEnOtrasApps]). Enséñala
 * como «Continuar como @[alias]» y, si [app] no es `null`, «con tu sesión de [app]» (es `null` si la persona oculta que
 * usa esa app). Se usa con [SesionYosiftware.continuarCon].
 */
class SesionEnOtraApp internal constructor(
    val alias: String,
    val idCuenta: String,
    val app: String?,
    internal val paquete: String,
    internal val ticket: String,
    /** Hasta cuándo vale el ticket, según el reloj del móvil. */
    internal val caduca: Long,
) {
    override fun toString() = "SesionEnOtraApp(alias=$alias, app=$app)"
}

/**
 * El ticket de reautenticación ([SesionYosiftware.reautenticarConContrasena]): va como `ticketReautenticacion` en la
 * operación delicada. Vale una sola vez, hasta [caduca] (milisegundos desde 1970, según el reloj del móvil).
 */
data class TicketReautenticacion(val ticket: String, val caduca: Long) {
    override fun toString() = "TicketReautenticacion(caduca=$caduca)"
}

data class ResumenNormas(val id: Long, val version: Int, val titulo: String)

/** El texto de unas normas, en Markdown. */
data class Normas(val id: Long, val version: Int, val titulo: String, val texto: String)

data class Token(
    val valor: String,
    val audiencia: String,
    /** Cuándo caduca, en milisegundos desde 1970 según el reloj del móvil. */
    val caduca: Long,
)

data class Tokens(
    /** Para la API de la plataforma (`aud: cuentas`). */
    val plataforma: Token,
    /** Para la API de la app, si tiene audiencia registrada. */
    val api: Token?,
)

/**
 * Un error que la app enseña o trata. [codigo] es el `code` de la plataforma (`ERRORES.md`) o uno de la librería:
 * - `sin_conexion`: no se ha podido hablar con la plataforma o con Firebase;
 * - `sin_sesion`: no hay sesión (pide tokens sin haber entrado);
 * - `estado_no_valido`: la acción no corresponde al estado actual;
 * - `credenciales_no_validas`, `usuario_deshabilitado` y `demasiados_intentos`: de Firebase, al entrar;
 * - `google_cancelado`, `google_no_disponible` y `google_sin_respuesta` (Google no ha respondido en 3 minutos): al
 *   entrar con Google;
 * - `contrasena_igual`, `contrasena_debil` y `contrasena_cambiada_sin_sesion`: al cambiar la contraseña (1.6.0);
 * - `correo_no_valido`, `mismo_correo` y `correo_ocupado`: al cambiar el correo (1.6.0), como los de la plataforma;
 *   desde la 1.7.0, el enlace lo manda la plataforma, que también puede responder `inicio_de_sesion_antiguo` y
 *   `demasiadas_peticiones`;
 * - `reautenticacion_requerida`: Firebase pide volver a escribir la contraseña (al cambiarla);
 * - `respuesta_no_valida`: la respuesta no tiene el formato esperado.
 */
class ErrorSesion(
    val codigo: String,
    val mensaje: String,
    val campo: String? = null,
    val estadoHttp: Int? = null,
    causa: Throwable? = null,
) : Exception("$codigo: $mensaje", causa) {
    fun comoMotivo() = Motivo(codigo, mensaje)

    companion object {
        /**
         * El error de una respuesta de la plataforma que no es 2xx, con su `code`, su frase para la persona (`error`) y
         * su `field` (desde la 1.7.0, para las llamadas que la app hace con su propio cliente: [SesionYosiftware.conTokenDePlataforma]).
         * Sin `code`, `plataforma_no_disponible` (5xx) o `respuesta_no_valida`.
         */
        fun deLaPlataforma(estadoHttp: Int, cuerpo: String): ErrorSesion = deLaPlataforma(estadoHttp, jsonDe(cuerpo))

        internal fun deLaPlataforma(estadoHttp: Int, json: JSONObject): ErrorSesion {
            val codigo = json.cadena("code")?.takeIf { it.isNotEmpty() }
                ?: if (estadoHttp >= 500) "plataforma_no_disponible" else "respuesta_no_valida"
            val mensaje = json.cadena("error") ?: "Algo ha fallado en Yosiftware. Inténtalo de nuevo."
            return ErrorSesion(codigo, mensaje, json.cadena("field"), estadoHttp)
        }

        /**
         * El error de una llamada que no ha llegado a la plataforma (`sin_conexion`), con la misma frase que da la
         * librería. Desde la 1.7.0, para las llamadas que la app hace con su propio cliente, junto a [deLaPlataforma].
         */
        fun sinConexion(causa: Throwable? = null): ErrorSesion =
            ErrorSesion("sin_conexion", "No se ha podido conectar con Yosiftware. Comprueba la conexión.", causa = causa)
    }
}
