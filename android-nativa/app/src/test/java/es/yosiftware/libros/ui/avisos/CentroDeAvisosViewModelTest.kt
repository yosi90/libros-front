package es.yosiftware.libros.ui.avisos

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.AvisoDelCentro
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.RepositorioAvisos
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** La campana contra una plataforma falsa: contadores, abrir, filtros, leer, marcar todas, acciones y cambio de cuenta. */
@OptIn(ExperimentalCoroutinesApi::class)
class CentroDeAvisosViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Montaje(val sesion: SesionFalsa, val llamadas: MutableList<String>, val respuestas: MutableMap<String, String>, val fallos: MutableMap<String, ErrorSesion>, val eventos: MutableSharedFlow<Llegada>, val vm: CentroDeAvisosViewModel)

    private fun aviso(id: Int, leida: Boolean = false, acciones: String = "[]", resuelta: String = "null") =
        """{"id": $id, "web": {"clave": "libros", "nombre": "Libros", "icono": "/v1/webs/libros/imagenes/icono?v=2"}, "tipo": {"clave": "peticion.resuelta"},
            "titulo": "T$id", "cuerpo": "C$id", "enlace": "https://qa-libros.yosiftware.es/dashboard/profile?section=requests", "botones": [], "acciones": $acciones,
            "resuelta": $resuelta, "cantidad": 1, "creada": "2026-10-25T10:00:00Z", "actualizada": "2026-10-25T10:00:00Z", "vista": false, "leida": $leida, "marca": null}"""

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val llamadas = mutableListOf<String>()
        val respuestas = mutableMapOf(
            "GET /v1/notificaciones/contador" to """{"noVistas": 2, "noLeidas": 3}""",
            "POST /v1/notificaciones/vistas" to """{"noVistas": 0, "noLeidas": 3}""",
            "GET /v1/notificaciones?limite=30" to """{"notificaciones": [${aviso(1)}, ${aviso(2, leida = true)}], "cursor": "c1", "noVistas": 0, "noLeidas": 3}""",
            "GET /v1/notificaciones?limite=30&cursor=c1" to """{"notificaciones": [${aviso(2, leida = true)}, ${aviso(3)}], "cursor": null, "noVistas": 0, "noLeidas": 3}""",
            "GET /v1/notificaciones?limite=30&sinLeer=true" to """{"notificaciones": [${aviso(1)}], "cursor": null, "noVistas": 0, "noLeidas": 3}""",
            "POST /v1/notificaciones/leidas" to """{"noVistas": 0, "noLeidas": 0}""",
        )
        val fallos = mutableMapOf<String, ErrorSesion>()
        val repositorio = RepositorioAvisos { metodo, ruta, _ ->
            val clave = "$metodo $ruta"
            llamadas += clave
            fallos[clave]?.let { throw it }
            respuestas[clave].orEmpty()
        }
        val eventos = MutableSharedFlow<Llegada>(extraBufferCapacity = 8)
        return Montaje(sesion, llamadas, respuestas, fallos, eventos, CentroDeAvisosViewModel(ambito, repositorio, eventos))
    }

    @Test
    fun abrirMarcaVistoYCargaLaPrimeraPagina() = runTest {
        val m = montar()
        runCurrent()
        assertEquals(2, m.vm.contadores.noVistas)
        m.vm.alternar()
        assertEquals(0, m.vm.contadores.noVistas)
        runCurrent()
        assertTrue(m.vm.abierto)
        assertTrue("POST /v1/notificaciones/vistas" in m.llamadas)
        assertEquals(listOf(1L, 2L), m.vm.lista.map { it.id })
        assertEquals("/v1/webs/libros/imagenes/icono?v=2", m.vm.lista[0].icono)
        m.vm.verMas()
        runCurrent()
        assertEquals(listOf(1L, 2L, 3L), m.vm.lista.map { it.id })
        m.vm.alternar()
        assertFalse(m.vm.abierto)
    }

    @Test
    fun leerUnaYMarcarTodas() = runTest {
        val m = montar()
        m.vm.abrir()
        runCurrent()
        m.vm.pulsar(m.vm.lista.first())
        runCurrent()
        assertFalse(m.vm.abierto)
        assertTrue(m.vm.lista.first().leida)
        assertEquals(2, m.vm.contadores.noLeidas)
        assertTrue("POST /v1/notificaciones/1/leida" in m.llamadas)

        m.vm.abrir()
        runCurrent()
        m.vm.elegirFiltro(true)
        runCurrent()
        assertEquals(listOf(1L), m.vm.lista.map { it.id })
        m.vm.marcarTodas()
        runCurrent()
        assertTrue(m.vm.lista.isEmpty())
        assertEquals(0, m.vm.contadores.noLeidas)
    }

    @Test
    fun aceptarYLosErroresDeAccion() = runTest {
        val m = montar()
        m.respuestas["GET /v1/notificaciones?limite=30"] =
            """{"notificaciones": [${aviso(5, acciones = """[{"clave": "aceptar", "texto": "Aceptar"}]""")}], "cursor": null, "noVistas": 0, "noLeidas": 1}"""
        m.vm.abrir()
        runCurrent()
        assertEquals("aceptar", m.vm.lista.single().acciones.single().clave)
        m.respuestas["POST /v1/notificaciones/5/acciones/aceptar"] = """{"notificacion": ${aviso(5, leida = true, resuelta = "\"Aceptada\"")}}"""
        // Lo que la plataforma devuelve después, al releer: ya resuelta.
        m.respuestas["GET /v1/notificaciones?limite=30"] = """{"notificaciones": [${aviso(5, leida = true, resuelta = "\"Aceptada\"")}], "cursor": null, "noVistas": 0, "noLeidas": 0}"""
        m.vm.accion(m.vm.lista.single(), "aceptar")
        assertTrue(5L in m.vm.ocupadas)
        runCurrent()
        assertEquals("Aceptada", m.vm.lista.single().resuelta)
        assertTrue(m.vm.ocupadas.isEmpty())

        m.fallos["POST /v1/notificaciones/5/acciones/rechazar"] =
            ErrorSesion.deLaPlataforma(409, """{"error": "Esa acción ya no está disponible.", "code": "accion_no_disponible"}""")
        m.vm.accion(m.vm.lista.single(), "rechazar")
        runCurrent()
        assertEquals("Esa acción ya no está disponible.", m.vm.errorDeAccion)
    }

    @Test
    fun losEventosYElCambioDeCuenta() = runTest {
        val m = montar()
        runCurrent()
        val antes = m.llamadas.count { it == "GET /v1/notificaciones/contador" }
        m.eventos.emit(Llegada.Evento(9, "notificacion.creada", JSONObject(), null))
        m.eventos.emit(Llegada.Evento(10, "chat.mensaje", JSONObject(), null))
        runCurrent()
        assertEquals(antes + 1, m.llamadas.count { it == "GET /v1/notificaciones/contador" })
        m.vm.abrir()
        runCurrent()
        m.sesion.estado.value = conSesion("B")
        runCurrent()
        assertFalse(m.vm.abierto)
        assertTrue(m.vm.lista.isEmpty())
    }

    @Test
    fun laHora() {
        val zona = ZoneId.of("Europe/Madrid")
        assertEquals("11:00", cuando("2026-10-25T10:00:00Z", zona, LocalDate.of(2026, 10, 25)))
        assertEquals("25/10 11:00", cuando("2026-10-25T10:00:00Z", zona, LocalDate.of(2026, 10, 26)))
        assertEquals("", cuando("", zona))
        // La lectura del modelo, con `marca` y logro.
        val conMarca = AvisoDelCentro.de(JSONObject("""{"id": 1, "web": {"clave": "social", "nombre": "Yosiftware", "icono": null}, "titulo": "T",
            "marca": {"clave": "libros", "nombre": "Libros", "icono": "/v1/webs/libros/icono"}, "logro": {"imagen": "/img"}}"""))
        assertEquals("libros", conMarca.marca)
        assertEquals("/v1/webs/libros/icono", conMarca.icono)
        assertEquals("/img", conMarca.imagenDelLogro)
    }
}
