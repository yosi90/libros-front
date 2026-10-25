package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.repositorios.TicketDeTiempoReal
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/** El socket del tiempo real contra un gateway falso (MockWebServer): ticket, saludo, cursor, cierres y canales. */
class TiempoRealTest {
    private lateinit var servidor: MockWebServer
    private val alcance = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val llegadas = Channel<Llegada>(Channel.UNLIMITED)
    private val tickets = AtomicInteger(0)

    /** El lado del gateway de una conexión: lo que recibe y su socket. */
    private class Gateway : WebSocketListener() {
        val recibidos = LinkedBlockingQueue<String>()
        val socket = CompletableDeferred<WebSocket>()

        override fun onOpen(webSocket: WebSocket, response: Response) {
            socket.complete(webSocket)
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            recibidos.add(text)
        }

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
            webSocket.close(code, null)
        }

        /** El siguiente frame que no sea un ping. */
        fun siguiente(): JSONObject {
            while (true) {
                val texto = recibidos.poll(3, TimeUnit.SECONDS) ?: error("No ha llegado nada al gateway")
                val json = JSONObject(texto)
                if (json.optString("tipo") != "ping") return json
            }
        }
    }

    /** Los campos de un frame como texto: el `JSONObject` de la JVM no conserva el orden de las claves. */
    private fun JSONObject.campos(): Map<String, String> = keys().asSequence().associateWith { get(it).toString() }

    @Before
    fun arrancar() {
        servidor = MockWebServer()
        servidor.start()
    }

    @After
    fun parar() {
        alcance.cancel()
        servidor.close()
    }

    private fun gateway(): Gateway = Gateway().also { servidor.enqueue(MockResponse.Builder().webSocketUpgrade(it).build()) }

    private fun tiempoReal(ticket: suspend () -> TicketDeTiempoReal = { TicketDeTiempoReal("tr1.${tickets.incrementAndGet()}", servidor.url("/ws").toString()) }) =
        TiempoReal(ticket, alcance, OkHttpClient(), esperas = listOf(50L, 100L), esperaPorExceso = 100, latido = 150).also { tiempo ->
            alcance.launch(start = CoroutineStart.UNDISPATCHED) { tiempo.eventos.collect { llegadas.send(it) } }
        }

    private suspend fun llega(): Llegada = withTimeout(3_000) { llegadas.receive() }

    private suspend fun WebSocket.manda(json: String) {
        send(json)
        delay(20) // en orden: OkHttp entrega en el orden de envío, pero así no se mezclan con las aserciones
    }

    @Test
    fun conectaYGuardaElCursorSinPisarloAlReconectar() = runBlocking {
        val primero = gateway()
        val tiempo = tiempoReal()
        tiempo.iniciar()
        val ws = withTimeout(3_000) { primero.socket.await() }
        assertNull(servidor.takeRequest().url.queryParameter("desde"))

        ws.manda("""{"tipo":"conectado","cuenta":"c1","secuencia":10}""")
        assertEquals(Llegada.Conectado(reconexion = false), llega())
        assertEquals(10L, tiempo.cursor)

        ws.manda("""{"secuencia":11,"tipo":"chat.mensaje","datos":{"conversacion":7},"fecha":"2026-10-25T10:00:00Z"}""")
        ws.manda("""{"secuencia":11,"tipo":"chat.mensaje","datos":{"conversacion":7}}""")
        ws.manda("""{"secuencia":12,"tipo":"chat.leido","datos":{"conversacion":7}}""")
        ws.manda("""{"tipo":"escribiendo","conversacion":7,"cuenta":"c2"}""")
        val once = llega() as Llegada.Evento
        assertEquals(11L to "chat.mensaje", once.secuencia to once.tipo)
        assertEquals(7, once.datos.optInt("conversacion"))
        assertEquals(12L, (llega() as Llegada.Evento).secuencia)
        assertEquals(Llegada.Escribiendo(7, "c2"), llega())

        tiempo.abrirEspacio(41)
        assertEquals(mapOf("tipo" to "espacio.abrir", "espacio" to "41"), primero.siguiente().campos())
        ws.manda("""{"tipo":"espacio.abierto","espacio":41,"secuencia":5,"presentes":[]}""")
        ws.manda("""{"tipo":"espacio.mensaje","espacio":99,"secuencia":1,"idExterno":"x","datos":{},"fecha":"f"}""")
        ws.manda("""{"tipo":"espacio.mensaje","espacio":41,"secuencia":6,"idExterno":"club-8:1","datos":{"tipo":"hito"},"fecha":"f"}""")
        val delClub = llega() as Llegada.DelEspacio
        assertEquals(Triple(41L, 6L, "club-8:1"), Triple(delClub.espacio, delClub.secuencia, delClub.idExterno))

        tiempo.escribiendo(7)
        assertEquals(mapOf("tipo" to "escribiendo", "conversacion" to "7"), primero.siguiente().campos())
        assertEquals("ping", JSONObject(primero.recibidos.poll(3, TimeUnit.SECONDS)!!).optString("tipo"))

        // El gateway cierra: se reconecta desde el cursor, y su `conectado` (ya en 50) no lo pisa.
        val segundo = gateway()
        ws.close(1000, null)
        val ws2 = withTimeout(3_000) { segundo.socket.await() }
        val pedida = servidor.takeRequest()
        assertEquals("12", pedida.url.queryParameter("desde"))
        assertEquals("tr1.2", pedida.url.queryParameter("ticket"))
        ws2.manda("""{"tipo":"conectado","cuenta":"c1","secuencia":50}""")
        assertEquals(Llegada.Conectado(reconexion = true), llega())
        assertEquals(mapOf("tipo" to "espacio.abrir", "espacio" to "41", "desde" to "6"), segundo.siguiente().campos())
        ws2.manda("""{"secuencia":13,"tipo":"chat.mensaje","datos":{}}""")
        assertEquals(13L, (llega() as Llegada.Evento).secuencia)

        // Cerrar un canal y el desfase.
        ws2.manda("""{"tipo":"espacio.desfase","espacio":41,"secuencia":30}""")
        assertEquals(Llegada.DesfaseDelEspacio(41), llega())
        tiempo.cerrarEspacio(41)
        assertEquals(mapOf("tipo" to "espacio.cerrar", "espacio" to "41"), segundo.siguiente().campos())
    }

    @Test
    fun sinSesionNoReconecta() = runBlocking {
        val primero = gateway()
        val tiempo = tiempoReal()
        tiempo.iniciar()
        val ws = withTimeout(3_000) { primero.socket.await() }
        ws.manda("""{"tipo":"conectado","cuenta":"c1","secuencia":1}""")
        assertEquals(Llegada.Conectado(false), llega())
        ws.close(4403, "sesion")
        assertEquals(Llegada.SesionCerrada, llega())
        delay(300)
        assertEquals(1, tickets.get())
        assertFalse(tiempo.conectado.value)

        val sinSesion = tiempoReal { throw ErrorDeLibros.sinSesion() }
        sinSesion.iniciar()
        assertEquals(Llegada.SesionCerrada, llega())
    }

    @Test
    fun unTicketRechazadoPideOtroYOlvidarEmpiezaDeCero() = runBlocking {
        val primero = gateway()
        val tiempo = tiempoReal()
        tiempo.iniciar()
        val ws = withTimeout(3_000) { primero.socket.await() }
        servidor.takeRequest()
        val segundo = gateway()
        ws.close(4401, "ticket")
        val ws2 = withTimeout(3_000) { segundo.socket.await() }
        assertEquals("tr1.2", servidor.takeRequest().url.queryParameter("ticket"))
        ws2.manda("""{"tipo":"conectado","cuenta":"c1","secuencia":8}""")
        // Antes no hubo saludo: no es una reconexión.
        assertEquals(Llegada.Conectado(false), llega())
        assertEquals(8L, tiempo.cursor)

        val tercero = gateway()
        tiempo.olvidar()
        assertNull(tiempo.cursor)
        tiempo.iniciar()
        withTimeout(3_000) { tercero.socket.await() }
        assertNull(servidor.takeRequest().url.queryParameter("desde"))
    }
}
