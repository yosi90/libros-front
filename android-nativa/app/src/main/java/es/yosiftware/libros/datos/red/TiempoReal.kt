package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.repositorios.TicketDeTiempoReal
import java.net.URLEncoder
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject

/** Lo que llega por el socket de la plataforma (administracion yosiftware: docs/publica/asyncapi.yaml). */
sealed interface Llegada {
    /** Un evento de la bandeja, con su secuencia: `chat.mensaje`, `chat.reaccion`, `chat.leido`, `chat.conversacion`… */
    data class Evento(val secuencia: Long, val tipo: String, val datos: JSONObject, val fecha: String?) : Llegada

    /** Alguien escribe en una conversación: enseñarlo unos 5 segundos si no llega otro. */
    data class Escribiendo(val conversacion: Long, val cuenta: String) : Llegada

    /**
     * El saludo del gateway. Con [reconexion], el socket ya estuvo abierto antes para esta cuenta: lo perdido llega
     * solo (`desde`), pero quien pinta relee por la API por si el hueco era mayor que lo que guarda la bandeja.
     */
    data class Conectado(val reconexion: Boolean) : Llegada

    /** La sesión ya no vale (4403 o 401 al pedir el ticket): no se reconecta hasta tener otra. */
    data object SesionCerrada : Llegada

    /** Algo que el backend de la web ha publicado en el canal de un espacio (un club). */
    data class DelEspacio(val espacio: Long, val secuencia: Long, val idExterno: String, val datos: JSONObject, val fecha: String?) : Llegada

    /** Lo perdido del canal ya no se conserva: recargar el club de la API de Libros. */
    data class DesfaseDelEspacio(val espacio: Long) : Llegada

    /** La cuenta ya no es miembro activo del espacio: se deja de escuchar. */
    data class EspacioCerrado(val espacio: Long) : Llegada

    /** No se ha podido abrir el canal (`espacio_no_encontrado`, `demasiados_espacios_abiertos`); el socket sigue. */
    data class ErrorDelEspacio(val espacio: Long, val codigo: String) : Llegada
}

/**
 * El tiempo real de la plataforma: un WebSocket por app y cuenta, abierto mientras la app está a la vista y con sesión
 * (en segundo plano lo cubre el push, que la plataforma no manda mientras haya un socket abierto). Se abre con un
 * ticket de un solo uso; guarda la secuencia del último evento y, al reconectar, pide lo que se perdió (`desde`).
 * Manda `ping` cada 25 segundos y reconecta con las esperas del SDK (1, 2, 5, 10 y 30 segundos).
 *
 * Cierres del contrato: 4401 (ticket) pide otro, con la misma espera creciente para no gastar los 60 tickets cada diez
 * minutos si falla en bucle; 4429 espera un minuto; 4400 y 4403 no reconectan. Por el mismo socket van los canales de
 * los espacios: los abiertos se vuelven a abrir tras cada `conectado`, cada uno desde su última secuencia.
 *
 * Sobre el de Fichas (`fichas/datos/chat/TiempoReal.kt`): el `conectado` solo pone el cursor si no había (allí lo
 * pisaba con el último del servidor y se saltaba lo perdido que llegaba justo después), y el 4401 también espera.
 */
class TiempoReal(
    private val ticket: suspend () -> TicketDeTiempoReal,
    private val alcance: CoroutineScope,
    private val cliente: OkHttpClient = Red.clienteDeSocket,
    private val esperas: List<Long> = ESPERAS,
    private val esperaPorExceso: Long = 60_000,
    private val latido: Long = 25_000,
) {
    private val llegadas = MutableSharedFlow<Llegada>(extraBufferCapacity = 256)
    val eventos: SharedFlow<Llegada> = llegadas.asSharedFlow()

    private val abierto = MutableStateFlow(false)

    /** Si el gateway ha saludado (`conectado`) y el socket sigue abierto. */
    val conectado: StateFlow<Boolean> = abierto.asStateFlow()

    private val cerrojo = Any()
    private var bucle: Job? = null
    @Volatile private var socket: WebSocket? = null
    private var secuencia: Long? = null
    private var yaConecto = false

    /** Los canales de espacios pedidos, con la última secuencia recibida de cada uno (`null`: empezar en el último). */
    private val espacios = linkedMapOf<Long, Long?>()

    /** Abre el socket si no lo está (idempotente). */
    fun iniciar() {
        synchronized(cerrojo) {
            if (bucle?.isActive == true) return
            bucle = alcance.launch { mantener() }
        }
    }

    /** Cierra el socket (al pasar a segundo plano); conserva el cursor y los canales para la vuelta. */
    fun parar() {
        synchronized(cerrojo) {
            bucle?.cancel()
            bucle = null
            socket?.close(1000, null)
            socket = null
            abierto.value = false
        }
    }

    /** Al cambiar de cuenta o cerrar la sesión: lo de la anterior no sirve. */
    fun olvidar() {
        parar()
        synchronized(cerrojo) {
            secuencia = null
            yaConecto = false
            espacios.clear()
        }
    }

    /** Pide lo pendiente desde la última secuencia entregada por este socket. */
    fun sincronizar() {
        enviar(JSONObject().put("tipo", "sincronizar"))
    }

    /** La persona está escribiendo: mandarlo cada pocos segundos mientras escribe (el gateway reparte uno cada 3 s). */
    fun escribiendo(conversacion: Long) {
        enviar(JSONObject().put("tipo", "escribiendo").put("conversacion", conversacion))
    }

    /** Escucha el canal de [espacio]; si el socket está abierto, lo abre ya, y si no, al conectar. */
    fun abrirEspacio(espacio: Long) {
        val ahora = synchronized(cerrojo) {
            if (espacio in espacios) return
            espacios[espacio] = null
            abierto.value
        }
        if (ahora) enviar(abrir(espacio, null))
    }

    fun cerrarEspacio(espacio: Long) {
        val ahora = synchronized(cerrojo) {
            if (espacio !in espacios) return
            espacios.remove(espacio)
            abierto.value
        }
        if (ahora) enviar(JSONObject().put("tipo", "espacio.cerrar").put("espacio", espacio))
    }

    /** El cursor de la bandeja (para las pruebas y para depurar). */
    val cursor: Long? get() = synchronized(cerrojo) { secuencia }

    private fun abrir(espacio: Long, desde: Long?): JSONObject =
        JSONObject().put("tipo", "espacio.abrir").put("espacio", espacio).also { json -> desde?.let { json.put("desde", it) } }

    private fun enviar(json: JSONObject) {
        socket?.send(json.toString())
    }

    private suspend fun mantener() {
        var intentos = 0
        while (alcance.isActive) {
            val cierre: Int = try {
                conectar(ticket())
            } catch (e: ErrorDeLibros) {
                when {
                    e.sinSesion -> {
                        llegadas.tryEmit(Llegada.SesionCerrada)
                        return
                    }
                    e.estadoHttp == 429 -> 4429
                    else -> CIERRE_DE_RED
                }
            }
            abierto.value = false
            socket = null
            when (cierre) {
                4403 -> {
                    llegadas.tryEmit(Llegada.SesionCerrada)
                    return
                }
                4400 -> return
                4429 -> delay(esperaPorExceso)
                ABIERTO_BIEN -> {
                    // Estuvo abierto: se empieza de nuevo por la espera más corta.
                    intentos = 0
                    delay(esperas.first())
                    intentos = 1
                }
                else -> {
                    delay(esperas[minOf(intentos, esperas.lastIndex)])
                    intentos++
                }
            }
        }
    }

    /** Abre el socket y espera a que se cierre; devuelve el código de cierre (o [ABIERTO_BIEN] / [CIERRE_DE_RED]). */
    private suspend fun conectar(ticket: TicketDeTiempoReal): Int {
        val fin = CompletableDeferred<Int>()
        var saludado = false
        val direccion = buildString {
            append(ticket.url)
            append(if ('?' in ticket.url) '&' else '?')
            append("ticket=").append(URLEncoder.encode(ticket.ticket, "UTF-8"))
            synchronized(cerrojo) { secuencia }?.let { append("&desde=").append(it) }
        }
        val oyente = object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                val json = runCatching { JSONObject(text) }.getOrNull() ?: return
                if (json.texto("tipo") == "conectado") saludado = true
                leer(webSocket, json)?.let { llegadas.tryEmit(it) }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(code, null)
                fin.complete(if (code == 1000 || code == 1001) siAbrio(saludado) else code)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                fin.complete(if (code == 1000 || code == 1001) siAbrio(saludado) else code)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                fin.complete(siAbrio(saludado))
            }
        }
        val ws = cliente.newWebSocket(Request.Builder().url(direccion).build(), oyente)
        socket = ws
        val pulso = alcance.launch {
            while (isActive) {
                delay(latido)
                ws.send("""{"tipo":"ping"}""")
            }
        }
        return try {
            fin.await()
        } finally {
            pulso.cancel()
            ws.cancel()
        }
    }

    private fun siAbrio(saludado: Boolean) = if (saludado) ABIERTO_BIEN else CIERRE_DE_RED

    private fun leer(ws: WebSocket, json: JSONObject): Llegada? {
        val tipo = json.texto("tipo").orEmpty()
        return when {
            tipo == "conectado" -> {
                val (reconexion, canales) = synchronized(cerrojo) {
                    if (secuencia == null) secuencia = (json.opt("secuencia") as? Number)?.toLong()
                    val antes = yaConecto
                    yaConecto = true
                    // Dentro del cerrojo: un canal pedido a la vez o va en esta lista o se manda al pedirlo.
                    abierto.value = true
                    antes to espacios.toList()
                }
                canales.forEach { (espacio, desde) -> ws.send(abrir(espacio, desde).toString()) }
                Llegada.Conectado(reconexion)
            }
            tipo == "pong" || tipo == "presencia" || tipo == "espacio.presencia" -> null
            tipo == "escribiendo" -> Llegada.Escribiendo(json.optLong("conversacion"), json.texto("cuenta").orEmpty())
            tipo.startsWith("espacio.") -> leerDelEspacio(tipo, json)
            json.has("secuencia") -> {
                val s = json.optLong("secuencia")
                synchronized(cerrojo) {
                    if ((secuencia ?: 0) >= s) return null // ya visto
                    secuencia = s
                }
                Llegada.Evento(s, tipo, json.optJSONObject("datos") ?: JSONObject(), json.texto("fecha"))
            }
            else -> null
        }
    }

    private fun leerDelEspacio(tipo: String, json: JSONObject): Llegada? {
        val espacio = json.optLong("espacio").takeIf { it > 0 } ?: return null
        val s = (json.opt("secuencia") as? Number)?.toLong()
        synchronized(cerrojo) {
            if (espacio !in espacios) return null
            when (tipo) {
                "espacio.abierto" -> if (espacios[espacio] == null && s != null) espacios[espacio] = s
                "espacio.mensaje" -> {
                    if (s == null || (espacios[espacio] ?: 0) >= s) return null
                    espacios[espacio] = s
                }
                "espacio.desfase" -> espacios[espacio] = s
                "espacio.cerrado" -> espacios.remove(espacio)
            }
        }
        return when (tipo) {
            "espacio.mensaje" -> Llegada.DelEspacio(espacio, s!!, json.texto("idExterno").orEmpty(), json.optJSONObject("datos") ?: JSONObject(), json.texto("fecha"))
            "espacio.desfase" -> Llegada.DesfaseDelEspacio(espacio)
            "espacio.cerrado" -> Llegada.EspacioCerrado(espacio)
            "espacio.error" -> Llegada.ErrorDelEspacio(espacio, json.texto("code").orEmpty())
            else -> null
        }
    }

    companion object {
        /** Las esperas entre reconexiones del SDK (`tiempo-real.ts`). */
        val ESPERAS = listOf(1_000L, 2_000L, 5_000L, 10_000L, 30_000L)

        /** Cerrado por la red antes del saludo, sin código del gateway. */
        private const val CIERRE_DE_RED = -1

        /** Estaba abierto y se cayó: se reconecta tras la espera más corta. */
        private const val ABIERTO_BIEN = -2
    }
}
