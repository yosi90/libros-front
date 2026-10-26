package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.cuenta.Generacion
import es.yosiftware.libros.datos.cuenta.exigir
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.SesionYosiftware
import java.io.IOException
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Las llamadas de Libros a la API de la plataforma (el perfil y, más adelante, el chat; los espacios los hace
 * `sesion.espacios`) con el mismo cliente HTTP que la API de Libros. No es otro cliente con su propio token: el token
 * de la plataforma, la renovación y el reintento único tras un 401 los pone la librería 1.7.0
 * (`sesion.conTokenDePlataforma`), y los errores son los suyos: `ErrorSesion.deLaPlataforma` si la respuesta no es 2xx
 * y `ErrorSesion.sinConexion` si no llega (ecosistema-kit/APK.md, «La librería 1.7.0»). `ErrorDeLibros.de` los
 * convierte para las pantallas.
 */
class ClientePlataforma(
    private val sesion: SesionYosiftware,
    private val generacion: Generacion = Generacion.FIJA,
    private val http: OkHttpClient = Red.cliente,
) {
    private val base = sesion.configuracion.api.trimEnd('/')

    /** [ruta] con su barra inicial, como en la documentación de la plataforma (`/v1/perfil`). Devuelve el cuerpo. */
    suspend fun llamar(metodo: String, ruta: String, cuerpo: JSONObject? = null): String {
        val deInicio = generacion.actual()
        val enviado = cuerpoDe(metodo, cuerpo)
        val respuesta = sesion.conTokenDePlataforma({ it.estado }) { token ->
            generacion.exigir(deInicio)
            enviar(solicitud(metodo, ruta, enviado).header("Authorization", "Bearer $token").build())
        }
        generacion.exigir(deInicio)
        if (!respuesta.correcta) throw errorDe(respuesta)
        return respuesta.cuerpo
    }

    suspend fun objeto(ruta: String): JSONObject = JSONObject(llamar("GET", ruta))

    /**
     * Una llamada sin token ni `Origin`: el acuse del push (`POST /v1/notificaciones/acuse`), que se firma solo. Lanza
     * los mismos errores que [llamar].
     */
    suspend fun sinToken(metodo: String, ruta: String, cuerpo: JSONObject? = null): String {
        val respuesta = enviar(solicitud(metodo, ruta, cuerpoDe(metodo, cuerpo)).build())
        if (!respuesta.correcta) throw errorDe(respuesta)
        return respuesta.cuerpo
    }

    private fun cuerpoDe(metodo: String, cuerpo: JSONObject?): RequestBody? = cuerpo?.toString()?.toRequestBody(Red.JSON) ?: Red.cuerpoVacio(metodo)

    private fun solicitud(metodo: String, ruta: String, cuerpo: RequestBody?): Request.Builder =
        Request.Builder().url(base + ruta).method(metodo, cuerpo).header("Accept", "application/json")

    /** Sin respuesta (sin red, tiempo agotado…), el `sin_conexion` de la librería. */
    private suspend fun enviar(solicitud: Request): RespuestaHttp = try {
        Red.enviar(http, solicitud)
    } catch (e: IOException) {
        throw ErrorSesion.sinConexion(e)
    }

    /** El error de la plataforma; en `cuenta_restringida`, con lo limitado y hasta cuándo ([Restricciones]). */
    private fun errorDe(respuesta: RespuestaHttp): ErrorSesion {
        val error = ErrorSesion.deLaPlataforma(respuesta.estado, respuesta.cuerpo)
        val restriccion = Restricciones.deLaRespuesta(respuesta.cuerpo) ?: return error
        return ErrorSesion(error.codigo, restriccion, error.campo, error.estadoHttp)
    }
}
