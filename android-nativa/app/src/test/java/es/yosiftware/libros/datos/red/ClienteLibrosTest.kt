package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.MensajesDeError
import es.yosiftware.libros.datos.cuenta.Generacion
import es.yosiftware.libros.datos.cuenta.RespuestaDeOtraCuenta
import java.net.ServerSocket
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.test.runTest
import mockwebserver3.Dispatcher
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

/** El cliente de la API de Libros contra un servidor falso: sin red real. */
class ClienteLibrosTest {
    private lateinit var servidor: MockWebServer
    private val tokens = TokensFalsos()
    private val generacion = AtomicLong(0)

    @Before
    fun arrancar() {
        servidor = MockWebServer()
        servidor.start()
    }

    @After
    fun parar() {
        servidor.close()
    }

    private fun cliente() = ClienteLibros(servidor.url("/").toString(), tokens, Generacion { generacion.get() })

    private fun respuesta(codigo: Int, cuerpo: String = "{}") = MockResponse.Builder().code(codigo).body(cuerpo).build()

    @Test
    fun llevaElTokenDeLaApiSinOrigenYConAgentePropio() = runTest {
        servidor.enqueue(respuesta(200, """[{"Id": 1}]"""))
        val r = cliente().get("catalogo/libros", mapOf("q" to "dune", "autorId" to null, "sagaId" to ""))
        assertEquals(200, r.estado)
        val pedida = servidor.takeRequest()
        assertEquals("GET", pedida.method)
        assertEquals("Bearer t1", pedida.headers["Authorization"])
        assertNull(pedida.headers["Origin"])
        assertEquals(Red.AGENTE, pedida.headers["User-Agent"])
        assertTrue(Red.AGENTE.startsWith("libros-android/"))
        assertEquals("application/json", pedida.headers["Accept"])
        // Los filtros vacíos o nulos no se mandan, como `toParams` de la web.
        assertEquals("/catalogo/libros?q=dune", pedida.url.encodedPath + "?" + pedida.url.encodedQuery)
    }

    @Test
    fun trasUn401PideOtroTokenYRepiteUnaVez() = runTest {
        servidor.enqueue(respuesta(401, """{"success": false, "error": "Tu sesión ha caducado.", "code": "token_expired"}"""))
        servidor.enqueue(respuesta(200, """{"Id": 7}"""))
        val r = cliente().get("libros/7")
        assertEquals(200, r.estado)
        assertEquals(listOf("t1"), tokens.rechazados)
        assertEquals("Bearer t1", servidor.takeRequest().headers["Authorization"])
        assertEquals("Bearer t2", servidor.takeRequest().headers["Authorization"])
        assertEquals(2, servidor.requestCount)
    }

    @Test
    fun unSegundo401NoSeRepite() = runTest {
        val cuerpo = """{"success": false, "error": "No has iniciado sesión.", "code": "unauthorized", "debug": {"message": "HTTP 401", "requestId": "abc"}}"""
        servidor.enqueue(respuesta(401, cuerpo))
        servidor.enqueue(respuesta(401, cuerpo))
        servidor.enqueue(respuesta(200))
        val error = falla { cliente().get("libros/7") }
        assertEquals(401, error.estadoHttp)
        assertEquals("unauthorized", error.codigo)
        assertEquals("No has iniciado sesión.", error.mensaje)
        assertTrue(error.sinSesion)
        assertEquals(2, servidor.requestCount)
        assertEquals(listOf("t1"), tokens.rechazados)
    }

    @Test
    fun elErrorSeLeeDelCuerpoConCodeYField() = runTest {
        servidor.enqueue(
            respuesta(
                400,
                """{"success": false, "error": "Revisa la fecha de publicación.", "code": "catalog_admin_validation_error", "field": "FechaPublicacion",
                   "debug": {"message": "HTTP 400: catalog_admin_validation_error; field=FechaPublicacion", "requestId": "9fd1b686178c4c039e08c81f1027d85f"}}""",
            ),
        )
        val error = falla { cliente().post("peticiones/catalogo", JSONObject().put("TipoEntidad", "libro")) }
        assertEquals("catalog_admin_validation_error", error.codigo)
        assertEquals("FechaPublicacion", error.campo)
        assertEquals("Revisa la fecha de publicación.", error.mensaje)
        assertEquals("9fd1b686178c4c039e08c81f1027d85f", error.idPeticion)
        assertEquals(400, error.estadoHttp)
        // El `error` del servidor manda sobre el texto propio de la pantalla.
        assertEquals("Revisa la fecha de publicación.", error.mensajeO("No se ha podido enviar."))
        val pedida = servidor.takeRequest()
        assertEquals("POST", pedida.method)
        assertTrue(pedida.headers["Content-Type"]!!.startsWith("application/json"))
    }

    @Test
    fun sinCodeNiFieldElCodigoEsElEstado() = runTest {
        servidor.enqueue(respuesta(404, """{"success": false, "error": "Ese libro no existe."}"""))
        val error = falla { cliente().get("libros/999") }
        assertEquals("http_404", error.codigo)
        assertNull(error.campo)
        assertEquals("Ese libro no existe.", error.mensaje)
    }

    @Test
    fun sinErrorSeUsaLaFraseDeSuCodeEnLaTablaDeLaApk() = runTest {
        servidor.enqueue(respuesta(409, """{"success": false, "code": "anthology_section_collection_forbidden"}"""))
        val error = falla { cliente().patch("coleccion/libros/3/resena", JSONObject()) }
        assertEquals("Esta sección se gestiona dentro de su antología.", error.mensaje)
        assertNull(error.textoDelServidor)
        assertEquals("Esta sección se gestiona dentro de su antología.", error.mensajeO("Otra frase"))
    }

    @Test
    fun unCuerpoQueNoEsJsonDaLaFraseGenerica() = runTest {
        servidor.enqueue(respuesta(502, "<html><body>Bad gateway</body></html>"))
        val error = falla { cliente().get("libros/7") }
        assertEquals("http_502", error.codigo)
        assertEquals(502, error.estadoHttp)
        assertEquals(MensajesDeError.GENERICO, error.mensaje)
        assertEquals("No se ha podido cargar el libro.", error.mensajeO("No se ha podido cargar el libro."))
    }

    @Test
    fun sinConexionEsSinConexion() = runTest {
        // Un puerto que nadie escucha: la conexión se rechaza sin salir del equipo.
        val puerto = ServerSocket(0).use { it.localPort }
        val cliente = ClienteLibros("http://127.0.0.1:$puerto/", tokens)
        val error = falla { cliente.get("libros/7") }
        assertEquals(ErrorDeLibros.SIN_CONEXION, error.codigo)
        assertTrue(error.sinConexion)
        assertEquals(MensajesDeError.SIN_CONEXION, error.mensaje)
        assertNull(error.estadoHttp)
        assertEquals(MensajesDeError.SIN_CONEXION, error.mensajeO("Otra frase"))
    }

    @Test
    fun laRespuestaQueLlegaTrasCambiarDeCuentaSeDescarta() = runTest {
        // El servidor responde bien, pero mientras tanto la persona ha cambiado de cuenta.
        servidor.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                generacion.incrementAndGet()
                return respuesta(200, """{"Id": 7}""")
            }
        }
        try {
            cliente().get("libros/7")
            fail("Tenía que descartarse")
        } catch (_: RespuestaDeOtraCuenta) {
        }
    }

    @Test
    fun un401TrasCambiarDeCuentaNoSeReintentaConLaNueva() = runTest {
        servidor.enqueue(respuesta(401, """{"error": "Caducado", "code": "token_expired"}"""))
        servidor.enqueue(respuesta(200))
        // Al pedir el token nuevo, la librería ya da el de la otra cuenta: no se usa.
        tokens.alRechazar = { generacion.incrementAndGet() }
        try {
            cliente().get("libros/7")
            fail("Tenía que descartarse")
        } catch (_: RespuestaDeOtraCuenta) {
        }
        assertEquals(1, servidor.requestCount)
    }

    @Test
    fun laConsultaYLaRutaSeCodificanComoEnLaWeb() {
        val cliente = ClienteLibros("https://qa-api.yosiftware.es/", tokens)
        assertEquals(
            "https://qa-api.yosiftware.es/catalogo/google-books/isbn/978%2084?q=el%20se%C3%B1or",
            cliente.url("catalogo/google-books/isbn/${codificarComponente("978 84")}", mapOf("q" to "el señor")).toString(),
        )
        assertEquals("caf%C3%A9%20(1).png", codificarComponente("café (1).png"))
        assertEquals("a-b_c.d!e~f*g'h", codificarComponente("a-b_c.d!e~f*g'h"))
        assertFalse(codificarComponente("a/b").contains('/'))
    }

    private suspend fun falla(bloque: suspend () -> Unit): ErrorDeLibros {
        try {
            bloque()
        } catch (e: ErrorDeLibros) {
            return e
        }
        fail("Tenía que fallar")
        throw IllegalStateException()
    }
}

/** Tokens falsos: `t1` hasta el primer rechazo y `t2` después. */
class TokensFalsos : FuenteDeTokens {
    private var vigente = "t1"
    val rechazados = mutableListOf<String>()
    var alRechazar: () -> Unit = {}

    override suspend fun token(): String = vigente

    override suspend fun tokenTrasRechazo(rechazado: String): String {
        rechazados += rechazado
        alRechazar()
        vigente = "t2"
        return vigente
    }
}
