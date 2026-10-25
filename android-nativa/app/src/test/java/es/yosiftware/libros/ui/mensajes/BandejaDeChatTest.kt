package es.yosiftware.libros.ui.mensajes

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.red.ConexionEnVivo
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La bandeja del chat: la carga, el contador, las relecturas por el tiempo real y el cambio de cuenta. */
@OptIn(ExperimentalCoroutinesApi::class)
class BandejaDeChatTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class EnVivoFalso : ConexionEnVivo {
        override val eventos = MutableSharedFlow<Llegada>(extraBufferCapacity = 16)
        val registro = mutableListOf<String>()
        override fun iniciar() { registro += "iniciar" }
        override fun parar() { registro += "parar" }
        override fun olvidar() { registro += "olvidar" }
    }

    private class Montaje(val sesion: SesionFalsa, val enVivo: EnVivoFalso, val bandeja: BandejaDeChat) {
        val respuestas = mutableMapOf<String, String>()
        var fallo: ErrorSesion? = null
        var espera: CompletableDeferred<Unit>? = null
        val lecturas = mutableListOf<String>()
    }

    private fun conversacion(id: Int, noLeidos: Int, actividad: String) =
        """{"id": $id, "tipo": "directa", "persona": {"id": "c$id", "alias": "p$id", "nombre": "P$id"}, "noLeidos": $noLeidos, "actividad": "$actividad"}"""

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        lateinit var montaje: Montaje
        val chat = RepositorioChat { metodo, ruta, _ ->
            val cuenta = ambito.identidad.value?.cuentaId
            montaje.lecturas += "$cuenta $metodo $ruta"
            montaje.espera?.await()
            montaje.fallo?.let { throw it }
            montaje.respuestas[cuenta].orEmpty()
        }
        val enVivo = EnVivoFalso()
        montaje = Montaje(sesion, enVivo, BandejaDeChat(chat, enVivo, ambito, backgroundScope))
        return montaje
    }

    @Test
    fun cargaAlVerseYSumaLosNoLeidos() = runTest {
        val m = montar()
        m.respuestas["A"] = """{"conversaciones": [${conversacion(1, 2, "2026-10-24T10:00:00Z")}, ${conversacion(2, 3, "2026-10-25T10:00:00Z")}]}"""
        runCurrent()
        assertEquals(emptyList<String>(), m.lecturas) // sin estar a la vista, nada
        m.bandeja.alVerse(true)
        runCurrent()
        assertEquals(listOf("iniciar"), m.enVivo.registro)
        assertEquals(listOf(2L, 1L), m.bandeja.estado.value.conversaciones.map { it.id })
        assertEquals(5, m.bandeja.sinLeer.value)

        m.bandeja.leida(2)
        runCurrent()
        assertEquals(2, m.bandeja.sinLeer.value)
        m.bandeja.quitar(1)
        runCurrent()
        assertEquals(0, m.bandeja.sinLeer.value)

        m.bandeja.alVerse(false)
        assertEquals(listOf("iniciar", "parar"), m.enVivo.registro)
    }

    @Test
    fun losEventosDelChatRelenEnSilencioAgrupados() = runTest {
        val m = montar()
        m.respuestas["A"] = """{"conversaciones": [${conversacion(1, 0, "2026-10-24T10:00:00Z")}]}"""
        m.bandeja.alVerse(true)
        runCurrent()
        m.lecturas.clear()

        m.respuestas["A"] = """{"conversaciones": [${conversacion(1, 4, "2026-10-24T10:00:00Z")}]}"""
        repeat(3) { m.enVivo.eventos.emit(Llegada.Evento(10L + it, "chat.mensaje", JSONObject(), null)) }
        m.enVivo.eventos.emit(Llegada.Evento(20, "perfil.cambiado", JSONObject(), null))
        runCurrent()
        assertEquals(emptyList<String>(), m.lecturas)
        advanceTimeBy(251)
        runCurrent()
        assertEquals(listOf("A GET /v1/chat/conversaciones"), m.lecturas)
        assertEquals(4, m.bandeja.sinLeer.value)

        // Una relectura que falla no quita la lista; la primera carga, sí enseña el error.
        m.fallo = ErrorSesion.sinConexion(java.io.IOException("sin red"))
        m.enVivo.eventos.emit(Llegada.Conectado(reconexion = true))
        advanceTimeBy(251)
        runCurrent()
        assertEquals(1, m.bandeja.estado.value.conversaciones.size)
        assertNull(m.bandeja.estado.value.error)
        m.bandeja.recargar()
        runCurrent()
        assertTrue(m.bandeja.estado.value.error!!.isNotBlank())
    }

    @Test
    fun alCambiarDeCuentaSeVaciaYDescartaLoDeLaAnterior() = runTest {
        val m = montar()
        m.respuestas["A"] = """{"conversaciones": [${conversacion(1, 7, "2026-10-24T10:00:00Z")}]}"""
        m.respuestas["B"] = """{"conversaciones": [${conversacion(9, 1, "2026-10-24T10:00:00Z")}]}"""
        m.bandeja.alVerse(true)
        runCurrent()
        assertEquals(7, m.bandeja.sinLeer.value)

        // Una lectura de A que tarda y llega cuando ya está B.
        m.espera = CompletableDeferred()
        m.bandeja.recargar(silencioso = true)
        runCurrent()
        m.sesion.estado.value = conSesion("B")
        runCurrent()
        assertEquals(0, m.bandeja.sinLeer.value)
        assertEquals(listOf("iniciar", "olvidar", "iniciar"), m.enVivo.registro)
        m.espera!!.complete(Unit)
        runCurrent()
        assertEquals(listOf(9L), m.bandeja.estado.value.conversaciones.map { it.id })
        assertEquals(1, m.bandeja.sinLeer.value)
    }
}
