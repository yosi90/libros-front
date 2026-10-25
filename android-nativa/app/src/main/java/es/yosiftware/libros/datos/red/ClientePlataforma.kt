package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.cuenta.Generacion
import es.yosiftware.libros.datos.cuenta.exigir
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.SesionYosiftware
import java.io.IOException
import okhttp3.MediaType.Companion.toMediaType
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
        val enviado: RequestBody? = cuerpo?.toString()?.toRequestBody(JSON)
            ?: if (metodo == "GET" || metodo == "DELETE") null else ByteArray(0).toRequestBody(null)
        val respuesta = sesion.conTokenDePlataforma({ it.estado }) { token ->
            generacion.exigir(deInicio)
            val solicitud = Request.Builder()
                .url(base + ruta)
                .method(metodo, enviado)
                .header("Accept", "application/json")
                .header("Authorization", "Bearer $token")
                .build()
            try {
                Red.enviar(http, solicitud)
            } catch (e: IOException) {
                throw ErrorSesion.sinConexion(e)
            }
        }
        generacion.exigir(deInicio)
        if (!respuesta.correcta) throw ErrorSesion.deLaPlataforma(respuesta.estado, respuesta.cuerpo)
        return respuesta.cuerpo
    }

    suspend fun objeto(ruta: String): JSONObject = JSONObject(llamar("GET", ruta))

    /**
     * Una llamada sin token ni `Origin`: el acuse del push (`POST /v1/notificaciones/acuse`), que se firma solo. Lanza
     * los mismos errores que [llamar].
     */
    suspend fun sinToken(metodo: String, ruta: String, cuerpo: JSONObject? = null): String {
        val enviado: RequestBody? = cuerpo?.toString()?.toRequestBody(JSON)
            ?: if (metodo == "GET" || metodo == "DELETE") null else ByteArray(0).toRequestBody(null)
        val solicitud = Request.Builder().url(base + ruta).method(metodo, enviado).header("Accept", "application/json").build()
        val respuesta = try {
            Red.enviar(http, solicitud)
        } catch (e: IOException) {
            throw ErrorSesion.sinConexion(e)
        }
        if (!respuesta.correcta) throw ErrorSesion.deLaPlataforma(respuesta.estado, respuesta.cuerpo)
        return respuesta.cuerpo
    }

    private companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
