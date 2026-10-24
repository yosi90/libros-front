package es.yosiftware.libros.datos

import es.yosiftware.sesion.ErrorSesion
import org.json.JSONException
import org.json.JSONObject

/**
 * El único error de los datos de Libros, para que las pantallas traten todos igual (docs/backend/api/ERRORES.md):
 * - [mensaje]: la frase para la persona. Es el `error` del cuerpo; si no lo trae, la de su `code` en la tabla de la
 *   APK actual ([MensajesDeError]) o una genérica. Nunca un código, una traza ni el `debug`.
 * - [codigo]: el `code` estable, para decidir (volver a entrar, el aviso de normas…). Sin `code`, `http_<estado>`. Los
 *   propios de la app: `sin_conexion` (no hubo respuesta, el mismo que da la librería de la sesión), `sin_sesion`,
 *   `respuesta_no_valida` (el JSON no tiene la forma esperada) y los de la librería al pedir los tokens.
 * - [campo]: el `field`, el nombre exacto del campo JSON, para marcar el control del formulario.
 * - [estadoHttp]: el estado de la respuesta, si la hubo.
 * - [idPeticion]: el `debug.requestId`, para un informe de fallo; no se enseña.
 */
class ErrorDeLibros(
    val codigo: String,
    val mensaje: String,
    val campo: String? = null,
    val estadoHttp: Int? = null,
    val idPeticion: String? = null,
    /** El `error` tal cual vino del servidor; `null` si no lo trajo (entonces [mensaje] es de la app). */
    val textoDelServidor: String? = null,
    causa: Throwable? = null,
) : Exception("$codigo: $mensaje", causa) {

    val sinConexion: Boolean get() = codigo == SIN_CONEXION

    /** La sesión ya no vale: no hay o la API la rechaza tras renovarla una vez. */
    val sinSesion: Boolean get() = codigo == SIN_SESION || estadoHttp == 401

    /** Bloqueo por normas pendientes: lo explica el aviso de normas, no un error (`isPolicyAcceptanceBlock`). */
    val bloqueoPorNormas: Boolean get() = MensajesDeError.esBloqueoPorNormas(codigo)

    /**
     * La frase con el texto propio de la pantalla si el servidor no trajo la suya, como `getApiErrorMessage` y
     * `getProductStateMessage` de la web: primero el `error` del servidor; después la tabla de códigos; sin conexión, el
     * aviso de conexión; y si no, [porDefecto].
     */
    fun mensajeO(porDefecto: String): String = textoDelServidor
        ?: MensajesDeError.deCodigo(codigo)
        ?: if (sinConexion) mensaje else porDefecto

    override fun toString(): String = "ErrorDeLibros(codigo=$codigo, estadoHttp=$estadoHttp, campo=$campo)"

    companion object {
        const val SIN_CONEXION = "sin_conexion"
        const val SIN_SESION = "sin_sesion"
        const val RESPUESTA_NO_VALIDA = "respuesta_no_valida"

        /** El error de una respuesta de la API de Libros que no es 2xx, leído de su cuerpo (ERRORES.md). */
        fun deRespuesta(estadoHttp: Int, cuerpo: String): ErrorDeLibros {
            val json = try {
                JSONObject(cuerpo)
            } catch (_: JSONException) {
                null
            }
            val codigo = json?.textoNoVacio("code") ?: "http_$estadoHttp"
            val texto = json?.textoNoVacio("error")
            return ErrorDeLibros(
                codigo = codigo,
                mensaje = texto ?: MensajesDeError.deCodigo(codigo) ?: MensajesDeError.GENERICO,
                campo = json?.textoNoVacio("field"),
                estadoHttp = estadoHttp,
                idPeticion = json?.optJSONObject("debug")?.textoNoVacio("requestId"),
                textoDelServidor = texto,
            )
        }

        /** Sin respuesta: sin red, tiempo agotado o el servidor no contesta (`status 0` en la web). */
        fun sinConexion(causa: Throwable? = null) =
            ErrorDeLibros(SIN_CONEXION, MensajesDeError.SIN_CONEXION, causa = causa)

        fun sinSesion() = ErrorDeLibros(SIN_SESION, "Entra con tu cuenta de Yosiftware para verlo.")

        fun respuestaNoValida(causa: Throwable? = null) =
            ErrorDeLibros(RESPUESTA_NO_VALIDA, "Libros ha respondido algo que la app no entiende. Inténtalo de nuevo.", causa = causa)

        /** Un error de la librería de la sesión (al pedir los tokens o al llamar a la plataforma), con su frase. */
        fun deSesion(error: ErrorSesion) = ErrorDeLibros(
            codigo = error.codigo,
            mensaje = error.mensaje,
            campo = error.campo,
            estadoHttp = error.estadoHttp,
            textoDelServidor = error.mensaje,
            causa = error,
        )

        /** Cualquier fallo de una llamada, como [ErrorDeLibros], para que las pantallas solo traten uno. */
        fun de(error: Throwable): ErrorDeLibros = when (error) {
            is ErrorDeLibros -> error
            is ErrorSesion -> deSesion(error)
            is JSONException -> respuestaNoValida(error)
            else -> ErrorDeLibros("error_inesperado", MensajesDeError.GENERICO, causa = error)
        }

        private fun JSONObject.textoNoVacio(nombre: String): String? =
            if (isNull(nombre)) null else (opt(nombre) as? String)?.trim()?.takeIf { it.isNotEmpty() }
    }
}
