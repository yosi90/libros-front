package es.yosiftware.libros.datos.red

import es.yosiftware.libros.cuenta.CorreoSinConfirmar
import es.yosiftware.libros.datos.cuenta.Generacion
import es.yosiftware.libros.datos.cuenta.RespuestaDeOtraCuenta
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
 * Las llamadas de Libros a la API de la plataforma que no hace la librería (el perfil, el chat, la campana, el push y
 * la IA; los espacios y la búsqueda de personas los hacen `sesion.espacios` y `sesion.social`) con el mismo cliente
 * HTTP que la API de Libros. No es otro cliente con su propio token: el token de la plataforma, la renovación y el
 * reintento único tras un 401 los pone la librería 1.7.0 (`sesion.conTokenDePlataforma`), y los errores son los suyos:
 * `ErrorSesion.deLaPlataforma` si la respuesta no es 2xx y `ErrorSesion.sinConexion` si no llega (ecosistema-kit/APK.md,
 * «La librería 1.7.0»). `ErrorDeLibros.de` los convierte para las pantallas.
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

    /**
     * El error de la plataforma, con su `mensaje` tal cual: en `cuenta_restringida` ya dice qué está limitado, hasta
     * cuándo y dónde verlo (librería 1.10.0, que también trae el `detalle`).
     */
    private fun errorDe(respuesta: RespuestaHttp): Exception = errorDeLaPlataforma(ErrorSesion.deLaPlataforma(respuesta.estado, respuesta.cuerpo))
}

/** El `code` de la librería 1.10.0 para lo que se pidió con una cuenta que ya no es la activa. */
const val CUENTA_CAMBIADA = "cuenta_cambiada"

/**
 * Lo que la app hace con un error de la plataforma, venga de [ClientePlataforma] o de la librería (`sesion.espacios` y
 * `sesion.social`). Con lo social y el correo sin confirmar (kit 1.80), abre la hoja del código. `cuenta_cambiada`
 * (librería 1.10.0) es lo de una cuenta que ya no está activa: se descarta en silencio ([RespuestaDeOtraCuenta]), como
 * un cambio de generación, y nunca se enseña. Lo demás vuelve tal cual, y las pantallas enseñan su `mensaje`
 * ([es.yosiftware.libros.datos.ErrorDeLibros.deSesion]).
 */
fun errorDeLaPlataforma(error: ErrorSesion): Exception {
    if (error.codigo == CUENTA_CAMBIADA) return RespuestaDeOtraCuenta()
    if (CorreoSinConfirmar.loPide(error.codigo, error.estadoHttp)) CorreoSinConfirmar.pedir()
    return error
}
