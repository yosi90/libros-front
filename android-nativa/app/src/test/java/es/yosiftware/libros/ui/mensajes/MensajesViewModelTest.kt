package es.yosiftware.libros.ui.mensajes

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Comunidad › Mensajes: el creador de directos y grupos, la conversación abierta y el cambio de cuenta. */
@OptIn(ExperimentalCoroutinesApi::class)
class MensajesViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Montaje(val sesion: SesionFalsa, val llamadas: MutableList<String>, val vm: MensajesViewModel)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val llamadas = mutableListOf<String>()
        val respuestas = mapOf(
            "GET /v1/social/amistades?limite=100" to """{"vinculos": [{"persona": {"id": "c2", "alias": "zoe", "nombre": "Zoe"}}, {"persona": {"id": "c3", "alias": "ana", "nombre": "Álvaro"}}, {"persona": {"id": "c4", "alias": "x", "borrada": true}}]}""",
            "POST /v1/chat/conversaciones/directa" to """{"id": 12}""",
            "POST /v1/chat/grupos" to """{"id": 13}""",
        )
        val chat = RepositorioChat { metodo, ruta, cuerpo ->
            llamadas += "$metodo $ruta" + (cuerpo?.let { " $it" } ?: "")
            respuestas["$metodo $ruta"].orEmpty()
        }
        val bandeja = BandejaDeChat(chat, null, ambito, backgroundScope)
        return Montaje(sesion, llamadas, MensajesViewModel(ambito, bandeja, chat))
    }

    @Test
    fun unDirectoAbreSuConversacion() = runTest {
        val m = montar()
        m.vm.alternarCreador(Creador.DIRECTO)
        runCurrent()
        // En orden alfabético español y sin las cuentas borradas.
        assertEquals(listOf("Álvaro", "Zoe"), m.vm.amistades.map { it.nombre })
        m.vm.iniciarDirecto(m.vm.amistades[1])
        runCurrent()
        assertEquals(12L, m.vm.abierta)
        assertNull(m.vm.creador)
        // Pulsar otra vez el creador abierto lo cierra, y las amistades no se vuelven a pedir.
        m.vm.alternarCreador(Creador.GRUPO)
        m.vm.alternarCreador(Creador.GRUPO)
        runCurrent()
        assertNull(m.vm.creador)
        assertEquals(1, m.llamadas.count { it.startsWith("GET /v1/social/amistades") })
    }

    @Test
    fun unGrupoPideTituloYAlguien() = runTest {
        val m = montar()
        m.vm.alternarCreador(Creador.GRUPO)
        runCurrent()
        m.vm.busquedaDelGrupo = "ZO"
        assertEquals(listOf("Zoe"), m.vm.candidatos.map { it.nombre })
        m.vm.busquedaDelGrupo = "ana"
        assertEquals(listOf("Álvaro"), m.vm.candidatos.map { it.nombre })
        m.vm.tituloDelGrupo = " L "
        m.vm.alternarElegida("c3")
        assertFalse(m.vm.puedeCrearGrupo)
        m.vm.tituloDelGrupo = "Lectoras"
        assertTrue(m.vm.puedeCrearGrupo)
        m.vm.crearGrupo()
        runCurrent()
        assertEquals(13L, m.vm.abierta)
        assertEquals("", m.vm.tituloDelGrupo)
        assertTrue(m.vm.elegidas.isEmpty())
        assertTrue(m.llamadas.any { it.startsWith("POST /v1/chat/grupos") && it.contains("Lectoras") && it.contains("c3") })
    }

    @Test
    fun cerrarConAvisoYCambiarDeCuenta() = runTest {
        val m = montar()
        m.vm.abrir(7, mensaje = 90)
        assertEquals(90L, m.vm.resaltado)
        m.vm.cerrar(ConversacionViewModel.ACCESO_RETIRADO)
        assertNull(m.vm.abierta)
        assertEquals(ConversacionViewModel.ACCESO_RETIRADO, m.vm.avisoDeAcceso)
        m.vm.abrir(8)
        assertEquals("", m.vm.avisoDeAcceso)
        m.vm.filtro = FiltroDeChat.GRUPO
        m.sesion.estado.value = conSesion("B")
        runCurrent()
        assertNull(m.vm.abierta)
        assertEquals(FiltroDeChat.TODAS, m.vm.filtro)
    }
}
