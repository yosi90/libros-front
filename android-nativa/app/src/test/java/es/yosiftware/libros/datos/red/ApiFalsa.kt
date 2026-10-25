package es.yosiftware.libros.datos.red

import java.util.concurrent.AbstractExecutorService
import java.util.concurrent.TimeUnit
import okhttp3.Dispatcher
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer

/**
 * La API de Libros falsa para las pruebas de los ViewModels: responde desde [respuestas] (`"GET /clubes-lectura/8"`,
 * sin la consulta) en el mismo hilo, sin red, así que con `runCurrent` las llamadas ya han terminado. Lo que no está
 * responde 404. [pedidas] guarda cada llamada con su consulta y su cuerpo.
 */
class ApiFalsa {
    val respuestas = mutableMapOf<String, Pair<Int, String>>()
    val pedidas = mutableListOf<String>()
    val cuerpos = mutableListOf<String?>()

    fun responde(clave: String, cuerpo: String, codigo: Int = 200) {
        respuestas[clave] = codigo to cuerpo
    }

    fun pedidasA(prefijo: String): List<String> = pedidas.filter { it.startsWith(prefijo) }

    private val enElMismoHilo = object : AbstractExecutorService() {
        private var parado = false
        override fun execute(tarea: Runnable) = tarea.run()
        override fun shutdown() { parado = true }
        override fun shutdownNow(): MutableList<Runnable> { parado = true; return mutableListOf() }
        override fun isShutdown() = parado
        override fun isTerminated() = parado
        override fun awaitTermination(tiempo: Long, unidad: TimeUnit) = true
    }

    private val http: OkHttpClient = OkHttpClient.Builder()
        .dispatcher(Dispatcher(enElMismoHilo))
        .addInterceptor(Interceptor { cadena ->
            val solicitud = cadena.request()
            val ruta = solicitud.url.encodedPath
            val consulta = solicitud.url.encodedQuery?.let { "?$it" }.orEmpty()
            pedidas += "${solicitud.method} $ruta$consulta"
            cuerpos += solicitud.body?.let { cuerpo -> Buffer().also { cuerpo.writeTo(it) }.readUtf8() }
            val (codigo, cuerpo) = respuestas["${solicitud.method} $ruta"] ?: (404 to """{"error": "No está", "code": "not_found"}""")
            Response.Builder().request(solicitud).protocol(Protocol.HTTP_1_1).code(codigo).message("falsa")
                .body(cuerpo.toResponseBody("application/json".toMediaType())).build()
        })
        .build()

    val cliente = ClienteLibros("http://libros.prueba/", TokensFalsos(), http = http)
}
