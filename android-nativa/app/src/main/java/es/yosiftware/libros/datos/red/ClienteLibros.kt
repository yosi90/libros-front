package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.Generacion
import es.yosiftware.libros.datos.cuenta.exigir
import java.io.IOException
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/**
 * El único cliente de la API de Libros (`BuildConfig.API_LIBROS`). Todos los repositorios llaman por aquí:
 * - cada llamada lleva `Authorization: Bearer` con el token de la API de la cuenta activa ([FuenteDeTokens]);
 * - si la API responde 401, pide otro token (`tokensTrasRechazo`) y repite **una sola vez**; un segundo 401 es el error
 *   que venga en su cuerpo;
 * - lo que no es 2xx se lanza como [ErrorDeLibros], leído del cuerpo según ERRORES.md; sin respuesta, `sin_conexion`;
 * - lo que empezó con una cuenta no sigue con otra ([Generacion]): si la cuenta cambia mientras se esperan los tokens o
 *   la respuesta, se descarta (`RespuestaDeOtraCuenta`), y nunca se reintenta con los tokens de la nueva.
 *
 * Sin `Origin` y con el `User-Agent` de la app (lo pone [Red]).
 */
class ClienteLibros(
    base: String,
    private val tokens: FuenteDeTokens,
    private val generacion: Generacion = Generacion.FIJA,
    private val http: OkHttpClient = Red.cliente,
) {
    private val base: HttpUrl = base.trimEnd('/').plus('/').toHttpUrl()

    suspend fun get(ruta: String, consulta: Map<String, Any?> = emptyMap()): RespuestaHttp = llamar("GET", ruta, consulta)

    suspend fun post(ruta: String, cuerpo: Any? = null, consulta: Map<String, Any?> = emptyMap()): RespuestaHttp =
        llamar("POST", ruta, consulta, cuerpo)

    suspend fun put(ruta: String, cuerpo: Any? = null): RespuestaHttp = llamar("PUT", ruta, cuerpo = cuerpo)

    suspend fun patch(ruta: String, cuerpo: Any? = null): RespuestaHttp = llamar("PATCH", ruta, cuerpo = cuerpo)

    suspend fun delete(ruta: String, cuerpo: Any? = null): RespuestaHttp = llamar("DELETE", ruta, cuerpo = cuerpo)

    /**
     * Una llamada a [ruta] (relativa a la base, sin barra inicial: `catalogo/libros`). [consulta] va en la URL, sin
     * los valores `null` ni vacíos (como `toParams` de la web). [cuerpo] es un `JSONObject`, un `JSONArray`, un
     * [RequestBody] ya hecho (por ejemplo, multipart) o `null`.
     */
    suspend fun llamar(metodo: String, ruta: String, consulta: Map<String, Any?> = emptyMap(), cuerpo: Any? = null): RespuestaHttp {
        val deInicio = generacion.actual()
        val url = url(ruta, consulta)
        val enviado = cuerpoDe(metodo, cuerpo)
        var token = tokens.token()
        generacion.exigir(deInicio)
        var respuesta = enviar(metodo, url, enviado, token)
        generacion.exigir(deInicio)
        if (respuesta.estado == 401) {
            token = tokens.tokenTrasRechazo(token)
            generacion.exigir(deInicio)
            respuesta = enviar(metodo, url, enviado, token)
            generacion.exigir(deInicio)
        }
        if (!respuesta.correcta) throw ErrorDeLibros.deRespuesta(respuesta.estado, respuesta.cuerpo)
        return respuesta
    }

    /** La URL de [ruta] con [consulta], como la construye la web (`environment.apiUrl + ruta`). */
    fun url(ruta: String, consulta: Map<String, Any?> = emptyMap()): HttpUrl {
        val constructor = base.resolve(ruta.trimStart('/'))?.newBuilder()
            ?: throw IllegalArgumentException("Ruta no válida: $ruta")
        consulta.forEach { (nombre, valor) ->
            val texto = valor?.toString()
            if (!texto.isNullOrEmpty()) constructor.addQueryParameter(nombre, texto)
        }
        return constructor.build()
    }

    private suspend fun enviar(metodo: String, url: HttpUrl, cuerpo: RequestBody?, token: String): RespuestaHttp {
        val solicitud = Request.Builder()
            .url(url)
            .method(metodo, cuerpo)
            .header("Accept", "application/json")
            .header("Authorization", "Bearer $token")
            .build()
        return try {
            Red.enviar(http, solicitud)
        } catch (e: IOException) {
            throw ErrorDeLibros.sinConexion(e)
        }
    }

    private fun cuerpoDe(metodo: String, cuerpo: Any?): RequestBody? = when (cuerpo) {
        null -> Red.cuerpoVacio(metodo)
        is RequestBody -> cuerpo
        is JSONObject, is JSONArray -> cuerpo.toString().toRequestBody(Red.JSON)
        else -> throw IllegalArgumentException("Cuerpo no admitido: ${cuerpo::class.simpleName}")
    }
}
