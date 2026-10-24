package es.yosiftware.sesion

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Dns
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

internal data class Peticion(
    val metodo: String,
    val url: String,
    val cuerpo: String? = null,
    val cabeceras: Map<String, String> = emptyMap(),
)

internal data class Respuesta(val estado: Int, val cuerpo: String)

/** Lo que manda las llamadas. En las pruebas se cambia por uno simulado. */
internal fun interface Transporte {
    /** Lanza [IOException] si no hay respuesta. */
    suspend fun enviar(peticion: Peticion): Respuesta
}

/**
 * HTTP con OkHttp. No añade `Origin`, que las rutas nativas rechazan, y cada llamada lleva el `User-Agent` de la
 * librería.
 *
 * OkHttp y no `HttpURLConnection` (desde la 1.3.0, a petición de Fichas): en una red que anuncia IPv6 pero no lo saca a
 * internet, `HttpURLConnection` prueba las direcciones de una en una, empezando por las IPv6, y espera el tiempo de
 * conexión entero en cada una, así que entrar se iba a minutos. OkHttp prueba IPv6 e IPv4 a la vez, como los
 * navegadores («fast fallback»), y cada llamada tiene un final.
 */
internal class TransporteHttp(private val agente: String, private val dns: Dns = Dns.SYSTEM) : Transporte {
    override suspend fun enviar(peticion: Peticion): Respuesta = suspendCancellableCoroutine { espera ->
        val cuerpo = peticion.cuerpo?.toRequestBody(JSON)
            ?: if (peticion.metodo == "GET") null else ByteArray(0).toRequestBody(null)
        val solicitud = Request.Builder()
            .url(peticion.url)
            .method(peticion.metodo, cuerpo)
            .header("User-Agent", agente)
            .header("Accept", "application/json")
            .apply { peticion.cabeceras.forEach { (nombre, valor) -> header(nombre, valor) } }
            .build()
        val llamada = cliente.newCall(solicitud)
        espera.invokeOnCancellation { llamada.cancel() }
        llamada.enqueue(
            object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (espera.isActive) espera.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    val respuesta = try {
                        response.use { Respuesta(it.code, it.body.string()) }
                    } catch (error: IOException) {
                        if (espera.isActive) espera.resumeWithException(error)
                        return
                    }
                    if (espera.isActive) espera.resume(respuesta)
                }
            },
        )
    }

    /** Uno por sesión (una por app): comparte las conexiones. */
    private val cliente: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .dns(dns)
            .fastFallback(true)
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            // El final de cada llamada, con todo lo que tarde en conectar, enviar y recibir.
            .callTimeout(45, TimeUnit.SECONDS)
            .followRedirects(false)
            .followSslRedirects(false)
            .retryOnConnectionFailure(false)
            .build()
    }

    private companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
