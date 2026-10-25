package es.yosiftware.libros.datos.red

import es.yosiftware.libros.BuildConfig
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

/** Lo que llega de una llamada: el estado HTTP, el cuerpo como texto (UTF-8) y las cabeceras. */
class RespuestaHttp(val estado: Int, val cuerpo: String, val cabeceras: Map<String, String> = emptyMap()) {
    val correcta: Boolean get() = estado in 200..299
}

/**
 * La red de la app: un solo cliente HTTP para la API de Libros, la de la plataforma (con su token, `ClientePlataforma`)
 * y las portadas (Coil).
 *
 * La librería de la sesión no expone su cliente (`TransporteHttp` es interno), así que este es propio, con lo mismo que
 * ella: OkHttp con «fast fallback» (prueba IPv6 e IPv4 a la vez y se queda con la que conteste), para las redes que
 * anuncian IPv6 pero no lo sacan a internet; sin `Origin`, que las rutas nativas de la plataforma rechazan, y con un
 * `User-Agent` propio, porque Cloudflare rechaza algunos genéricos. Los tiempos son los de la APK de Capacitor
 * (`android/app/src/main/java/es/yosiftware/libros/Ipv4HttpPlugin.java`): 3 s para conectar, 30 s de lectura y 25 s
 * para la llamada entera.
 */
object Red {
    /** El `User-Agent` de todas las llamadas de la app. */
    val AGENTE: String = "libros-android/${BuildConfig.VERSION_NAME}"

    val cliente: OkHttpClient by lazy { crearCliente() }

    /** El del socket del tiempo real: el mismo, sin tiempo de llamada ni de lectura, que lo cortarían (lo mantiene el ping). */
    val clienteDeSocket: OkHttpClient by lazy {
        cliente.newBuilder().callTimeout(0, TimeUnit.MILLISECONDS).readTimeout(0, TimeUnit.MILLISECONDS).build()
    }

    fun crearCliente(agente: String = AGENTE): OkHttpClient = OkHttpClient.Builder()
        .fastFallback(true)
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .callTimeout(25, TimeUnit.SECONDS)
        .followRedirects(false)
        .followSslRedirects(false)
        // Ninguna llamada lleva `Origin`, y todas llevan el agente de la app (también las de Coil).
        .addInterceptor { cadena ->
            cadena.proceed(cadena.request().newBuilder().removeHeader("Origin").header("User-Agent", agente).build())
        }
        .build()

    /**
     * Manda [solicitud] sin bloquear un hilo y lee el cuerpo entero. Si se cancela la corrutina, se cancela la llamada.
     * Lanza [IOException] si no hay respuesta (sin red, tiempo agotado…).
     */
    suspend fun enviar(cliente: OkHttpClient, solicitud: Request): RespuestaHttp = suspendCancellableCoroutine { espera ->
        val llamada = cliente.newCall(solicitud)
        espera.invokeOnCancellation { llamada.cancel() }
        llamada.enqueue(
            object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (espera.isActive) espera.resumeWithException(e)
                }

                override fun onResponse(call: Call, response: Response) {
                    val leida = try {
                        response.use { r ->
                            RespuestaHttp(r.code, r.body.string(), r.headers.names().associateWith { r.headers.values(it).joinToString(",") })
                        }
                    } catch (e: IOException) {
                        if (espera.isActive) espera.resumeWithException(e)
                        return
                    }
                    if (espera.isActive) espera.resume(leida)
                }
            },
        )
    }
}
