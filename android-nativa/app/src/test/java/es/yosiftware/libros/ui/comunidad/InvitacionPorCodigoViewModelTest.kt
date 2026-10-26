package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La invitación por código del correo: «Entrar con otra cuenta» la conserva para la cuenta nueva; otro cambio la olvida. */
@OptIn(ExperimentalCoroutinesApi::class)
class InvitacionPorCodigoViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Montaje(val sesion: SesionFalsa, val llamadas: MutableList<String>, var deOtroCorreo: Boolean, val vm: InvitacionPorCodigoViewModel)

    private val invitacion = """{"id": 7, "espacio": {"id": 41, "idExterno": "club-8", "nombre": "Lectoras", "dosPasos": false}, "miembros": 3}"""

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true), guardada("B"))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val llamadas = mutableListOf<String>()
        var montaje: Montaje? = null
        val espacios = RepositorioEspacios { metodo, ruta, _ ->
            llamadas += "$metodo $ruta"
            if (montaje!!.deOtroCorreo) throw ErrorSesion.deLaPlataforma(403, """{"error": "Es para otro correo", "code": "correo_de_otra_cuenta"}""")
            invitacion
        }
        montaje = Montaje(sesion, llamadas, deOtroCorreo = true, vm = InvitacionPorCodigoViewModel(ambito, espacios, Avisador.Mudo))
        return montaje
    }

    @Test
    fun entrarConOtraCuentaLaRetomaConLaNueva() = runTest {
        val m = montar()
        m.vm.abrir("codigo-1")
        runCurrent()
        assertEquals(FalloDeInvitacion.OTRO_CORREO, (m.vm.paso as PasoDeInvitacion.Fallo).fallo)

        m.vm.conservarParaOtraCuenta()
        assertNull(m.vm.paso)
        m.deOtroCorreo = false
        m.sesion.estado.value = conSesion("B")
        runCurrent()

        val viendo = m.vm.paso as PasoDeInvitacion.Viendo
        assertEquals("Lectoras", viendo.invitacion.espacio)
        assertEquals(2, m.llamadas.count { it == "POST /v1/espacios/invitaciones/por-codigo" })
    }

    @Test
    fun sinPedirloOtroCambioDeCuentaLaOlvida() = runTest {
        val m = montar()
        m.deOtroCorreo = false
        m.vm.abrir("codigo-1")
        runCurrent()
        assertTrue(m.vm.paso is PasoDeInvitacion.Viendo)

        m.sesion.estado.value = conSesion("B")
        runCurrent()

        assertNull(m.vm.paso)
        assertEquals(1, m.llamadas.size)
    }
}
