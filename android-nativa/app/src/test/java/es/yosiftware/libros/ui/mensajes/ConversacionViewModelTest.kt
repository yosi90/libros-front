package es.yosiftware.libros.ui.mensajes

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
import java.io.File
import java.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** Una conversación contra una plataforma falsa: cargar, enviar y reintentar, el tiempo real, el borrador y el acceso. */
@OptIn(ExperimentalCoroutinesApi::class)
class ConversacionViewModelTest {
    @get:Rule
    val carpeta = TemporaryFolder()

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Plataforma {
        val respuestas = mutableMapOf<String, String>()
        val fallos = mutableMapOf<String, ErrorSesion>()
        val esperas = mutableMapOf<String, CompletableDeferred<Unit>>()
        val llamadas = mutableListOf<String>()
        val chat = RepositorioChat { metodo, ruta, cuerpo ->
            val clave = "$metodo $ruta"
            llamadas += clave + (cuerpo?.let { " $it" } ?: "")
            esperas[clave]?.await()
            fallos[clave]?.let { throw it }
            respuestas[clave].orEmpty()
        }
    }

    private class Montaje(
        val plataforma: Plataforma,
        val sesion: SesionFalsa,
        val bandeja: BandejaDeChat,
        val eventos: MutableSharedFlow<Llegada>,
        val escribiendo: MutableList<Long>,
        val crear: () -> ConversacionViewModel,
    )

    private var reloj = Instant.parse("2026-10-25T10:05:00Z")

    private fun mensaje(id: Int, persona: String, texto: String, extra: String = "") =
        """{"id": $id, "conversacion": 7, "tipo": "texto", "persona": {"id": "$persona", "alias": "$persona", "nombre": "${persona.uppercase()}"}, "texto": "$texto", "creado": "2026-10-25T10:00:00Z"$extra}"""

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val p = Plataforma()
        p.respuestas["GET /v1/chat/conversaciones/7/mensajes?limite=50"] = """{"mensajes": [${mensaje(1, "B", "Hola")}, ${mensaje(2, "A", "Qué tal", ""","propio": true""")}], "cursor": "c1"}"""
        p.respuestas["GET /v1/chat/conversaciones/7"] = """{"id": 7, "tipo": "grupo", "titulo": "Lectoras", "miembros": 2, "rol": "admin",
            "permisos": {"escribir": true, "administrar": true}, "participantes": [{"persona": {"id": "A", "alias": "a"}, "rol": "admin"}, {"persona": {"id": "B", "alias": "b", "nombre": "Bea"}}]}"""
        val bandeja = BandejaDeChat(p.chat, null, ambito, backgroundScope)
        val eventos = MutableSharedFlow<Llegada>(extraBufferCapacity = 16)
        val escribiendo = mutableListOf<Long>()
        var siguiente = 0
        val crear = {
            ConversacionViewModel(
                ambito, 7, p.chat, bandeja, eventos, { escribiendo += it }, carpeta.root,
                ahora = { reloj }, nuevoIdCliente = { "cliente-${++siguiente}" },
            )
        }
        return Montaje(p, sesion, bandeja, eventos, escribiendo, crear)
    }

    @Test
    fun cargaLosMensajesYElDetalleYMarcaLeidoALaVista() = runTest {
        val m = montar()
        val vm = m.crear()
        runCurrent()
        assertEquals(listOf(1L, 2L), vm.mensajes.map { it.id })
        assertEquals("c1", vm.cursor)
        assertEquals("Lectoras", vm.detalle?.titulo)
        assertTrue(vm.detalle!!.puedeGestionar)
        assertFalse(m.plataforma.llamadas.any { it.contains("leido") })
        vm.alVerse(true)
        runCurrent()
        assertTrue(m.plataforma.llamadas.contains("""POST /v1/chat/conversaciones/7/leido {"hasta":2}"""))
        // Una sola vez para el mismo último mensaje.
        vm.alVerse(true)
        runCurrent()
        assertEquals(1, m.plataforma.llamadas.count { it.contains("leido") })
    }

    @Test
    fun enviarFallaYReintentaConElMismoIdCliente() = runTest {
        val m = montar()
        val vm = m.crear()
        runCurrent()
        m.plataforma.fallos["POST /v1/chat/conversaciones/7/mensajes"] = ErrorSesion.sinConexion(java.io.IOException("sin red"))
        vm.escribir("  Nuevo  ")
        vm.enviar()
        assertEquals("", vm.borrador)
        val temporal = vm.mensajes.last()
        assertTrue(temporal.id < 0)
        assertEquals(EstadoDeEnvio.ENVIANDO, vm.envios[temporal.id])
        runCurrent()
        assertEquals(EstadoDeEnvio.FALLIDO, vm.envios[temporal.id])
        assertTrue(vm.errorDeAccion.isNotEmpty())

        m.plataforma.fallos.clear()
        m.plataforma.respuestas["POST /v1/chat/conversaciones/7/mensajes"] = mensaje(3, "A", "Nuevo", ""","propio": true, "idCliente": "cliente-1"""")
        vm.reintentar(vm.visibles.last())
        runCurrent()
        val envios = m.plataforma.llamadas.filter { it.startsWith("POST /v1/chat/conversaciones/7/mensajes") }
        assertEquals(2, envios.size)
        assertTrue(envios.all { it.contains("\"idCliente\":\"cliente-1\"") })
        assertEquals(listOf(1L, 2L, 3L), vm.mensajes.map { it.id })
        assertEquals(EstadoDeEnvio.ENVIADO, vm.envios[3])
    }

    @Test
    fun elEcoSinIdClienteSustituyeAlPendienteYLasReacciones() = runTest {
        val m = montar()
        val vm = m.crear()
        runCurrent()
        // El envío no responde todavía: llega antes el eco del tiempo real, sin `idCliente` ni `propio`.
        val respuesta = CompletableDeferred<Unit>()
        m.plataforma.esperas["POST /v1/chat/conversaciones/7/mensajes"] = respuesta
        m.plataforma.respuestas["POST /v1/chat/conversaciones/7/mensajes"] = mensaje(9, "A", "Eco", ""","propio": true, "idCliente": "cliente-1"""")
        vm.escribir("Eco")
        vm.enviar()
        runCurrent()
        m.eventos.emit(Llegada.Evento(5, "chat.mensaje", JSONObject("""{"conversacion": 7, "accion": "creado", "mensaje": ${mensaje(9, "A", "Eco")}}"""), null))
        runCurrent()
        assertEquals(listOf(1L, 2L, 9L), vm.mensajes.map { it.id })
        assertEquals(EstadoDeEnvio.ENVIADO, vm.envios[9])
        respuesta.complete(Unit)
        runCurrent()
        assertEquals(listOf(1L, 2L, 9L), vm.mensajes.map { it.id })

        m.eventos.emit(Llegada.Evento(6, "chat.reaccion", JSONObject("""{"conversacion": 7, "mensaje": 1, "cuenta": "A", "emoji": "❤️", "total": {"❤️": 2}}"""), null))
        runCurrent()
        val reacciones = vm.mensajes.first { it.id == 1L }.reacciones
        assertEquals(2, reacciones.porTipo[TipoDeReaccion.ME_GUSTA])
        assertEquals(TipoDeReaccion.ME_GUSTA, reacciones.mia)

        m.eventos.emit(Llegada.Evento(7, "chat.mensaje", JSONObject("""{"conversacion": 7, "accion": "caducado", "mensaje": {"id": 1, "conversacion": 7}}"""), null))
        m.eventos.emit(Llegada.Evento(8, "chat.mensaje", JSONObject("""{"conversacion": 99, "accion": "creado", "mensaje": ${mensaje(50, "B", "De otra")}}"""), null))
        runCurrent()
        assertFalse(vm.mensajes.any { it.id == 1L || it.id == 50L })
    }

    @Test
    fun escribiendoSeVeCincoSegundosYSeAvisaCadaTres() = runTest {
        val m = montar()
        val vm = m.crear()
        runCurrent()
        m.eventos.emit(Llegada.Escribiendo(7, "B"))
        m.eventos.emit(Llegada.Escribiendo(7, "A")) // la propia, no
        runCurrent()
        assertEquals("Bea está escribiendo…", vm.textoDeEscribiendo())
        advanceTimeBy(5_001)
        runCurrent()
        assertNull(vm.textoDeEscribiendo())

        vm.escribir("H")
        reloj = reloj.plusMillis(1_000)
        vm.escribir("Ho")
        reloj = reloj.plusMillis(2_100)
        vm.escribir("Hol")
        assertEquals(listOf(7L, 7L), m.escribiendo)
    }

    @Test
    fun elBorradorSeGuardaEnElMovilYVuelve() = runTest {
        val m = montar()
        val vm = m.crear()
        runCurrent()
        vm.escribir("A medias")
        advanceTimeBy(401)
        runCurrent()
        assertEquals("A medias", m.crear().borrador)
        vm.escribir("")
        advanceTimeBy(401)
        runCurrent()
        assertEquals("", m.crear().borrador)
        // En la carpeta de la cuenta, no en la base.
        assertFalse(File(carpeta.root, "chat-7.json").exists())
    }

    @Test
    fun perderElAccesoVuelveALaBandejaConElAviso() = runTest {
        val m = montar()
        val vm = m.crear()
        var aviso: String? = "sin llamar"
        vm.alPerderAcceso = { aviso = it }
        runCurrent()
        m.eventos.emit(Llegada.Evento(5, "chat.conversacion", JSONObject("""{"conversacion": 7, "motivo": "expulsion"}"""), null))
        runCurrent()
        assertEquals(ConversacionViewModel.ACCESO_RETIRADO, aviso)

        val m2 = montar()
        m2.plataforma.fallos["GET /v1/chat/conversaciones/7/mensajes?limite=50"] =
            ErrorSesion.deLaPlataforma(404, """{"error": "Esa conversación no existe o no estás en ella.", "code": "conversacion_no_encontrada"}""")
        val perdida = m2.crear()
        var aviso2: String? = null
        perdida.alPerderAcceso = { aviso2 = it }
        runCurrent()
        assertEquals(ConversacionViewModel.ACCESO_RETIRADO, aviso2)
    }

    @Test
    fun alCambiarDeCuentaSeVaciaYNoSeReintenta() = runTest {
        val m = montar()
        val vm = m.crear()
        runCurrent()
        vm.escribir("Algo")
        m.sesion.estado.value = conSesion("B")
        runCurrent()
        assertTrue(vm.mensajes.isEmpty())
        assertNull(vm.detalle)
        assertEquals("", vm.borrador)
        m.eventos.emit(Llegada.Evento(5, "chat.mensaje", JSONObject("""{"conversacion": 7, "accion": "creado", "mensaje": ${mensaje(9, "B", "Tarde")}}"""), null))
        runCurrent()
        assertTrue(vm.mensajes.isEmpty())
    }
}
