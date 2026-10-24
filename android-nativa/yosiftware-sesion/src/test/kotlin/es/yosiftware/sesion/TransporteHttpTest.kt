package es.yosiftware.sesion

import com.sun.net.httpserver.HttpServer
import java.net.InetAddress
import java.net.InetSocketAddress
import kotlinx.coroutines.runBlocking
import okhttp3.Dns
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * El transporte de verdad contra un servidor local: lo que manda y que no se queda esperando en una dirección que no
 * contesta (una red con el IPv6 roto, petición de Fichas), porque prueba la siguiente a la vez.
 */
class TransporteHttpTest {
    private val servidor = HttpServer.create(InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0).apply {
        createContext("/v1/eco") { intercambio ->
            val recibido = intercambio.requestBody.readBytes().toString(Charsets.UTF_8)
            val respuesta = JSONObject()
                .put("metodo", intercambio.requestMethod)
                .put("agente", intercambio.requestHeaders.getFirst("User-Agent"))
                .put("origen", intercambio.requestHeaders.getFirst("Origin"))
                .put("autorizacion", intercambio.requestHeaders.getFirst("Authorization"))
                .put("cuerpo", recibido)
                .toString().toByteArray()
            intercambio.sendResponseHeaders(201, respuesta.size.toLong())
            intercambio.responseBody.use { it.write(respuesta) }
        }
        start()
    }

    @After
    fun parar() = servidor.stop(0)

    private fun url() = "http://plataforma.prueba:${servidor.address.port}/v1/eco"

    @Test
    fun `manda el cuerpo, el agente y las cabeceras, sin Origin`() = runBlocking {
        val dns = Dns { listOf(InetAddress.getLoopbackAddress()) }
        val respuesta = TransporteHttp("yosiftware-sesion-android/prueba", dns)
            .enviar(Peticion("POST", url(), """{"a":1}""", mapOf("Authorization" to "Bearer t")))
        assertEquals(201, respuesta.estado)
        val eco = JSONObject(respuesta.cuerpo)
        assertEquals("POST", eco.getString("metodo"))
        assertEquals("yosiftware-sesion-android/prueba", eco.getString("agente"))
        assertTrue(eco.isNull("origen"))
        assertEquals("Bearer t", eco.getString("autorizacion"))
        assertEquals("""{"a":1}""", eco.getString("cuerpo"))
        assertEquals(201, TransporteHttp("x", dns).enviar(Peticion("POST", url())).estado)
    }

    @Test
    fun `con una direccion que no contesta delante, entra por la siguiente enseguida`() = runBlocking {
        // 192.0.2.1 (TEST-NET-1) no lleva a ninguna parte: como el IPv6 de una red que no lo saca a internet.
        val dns = Dns { listOf(InetAddress.getByName("192.0.2.1"), InetAddress.getLoopbackAddress()) }
        val inicio = System.nanoTime()
        val respuesta = TransporteHttp("x", dns).enviar(Peticion("GET", url()))
        val segundos = (System.nanoTime() - inicio) / 1e9
        assertEquals(201, respuesta.estado)
        assertTrue("Ha tardado $segundos s", segundos < 3)
    }
}
