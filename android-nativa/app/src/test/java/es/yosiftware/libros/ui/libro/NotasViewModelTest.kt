package es.yosiftware.libros.ui.libro

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Nota
import es.yosiftware.libros.datos.repositorios.ServidorDeNotas
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * Las notas sin botón de guardar («Cuaderno», F5): la nota se guarda sola en cuanto cumple lo que pide la API y,
 * mientras no, o sin conexión, se queda en el móvil y vuelve.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class NotasViewModelTest {
    @get:Rule
    val temporal = TemporaryFolder()

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class ServidorFalso : ServidorDeNotas {
        val llamadas = mutableListOf<String>()
        val notas = mutableListOf(Nota(1, "Kaladin", "Kaladin vuelve a volar al final.", "2026-07-06T10:00:00Z", 9))
        var sinRed = false
        private var siguienteId = 100

        private fun <T> anotar(llamada: String, respuesta: () -> T): T {
            if (sinRed) throw ErrorDeLibros.sinConexion()
            llamadas += llamada
            return respuesta()
        }

        override suspend fun notas(libroId: Int) = notas.toList()
        override suspend fun crearNota(libroId: Int, nombre: String, descripcion: String) =
            anotar("crearNota $nombre") { Nota(siguienteId++, nombre, descripcion, "2026-11-26T10:00:00Z", libroId) }
        override suspend fun cambiarNota(id: Int, nombre: String?, descripcion: String?) =
            anotar("cambiarNota $id $nombre") { Nota(id, nombre.orEmpty(), descripcion.orEmpty(), "2026-11-26T10:00:00Z", 9) }
        override suspend fun borrarNota(id: Int) = anotar("borrarNota $id") { Unit }
    }

    private class Montaje(val ambito: AmbitoDeCuenta, val servidor: ServidorFalso, val base: File, val red: MutableStateFlow<Boolean>, val tienda: ViewModelStore)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        return Montaje(ambito, ServidorFalso(), temporal.newFolder("borradores"), MutableStateFlow(true), ViewModelStore())
    }

    private fun Montaje.abrir(tienda: ViewModelStore = this.tienda): NotasViewModel {
        val fabrica = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = NotasViewModel(ambito, servidor, Avisador.Mudo, base, enLinea = red) as T
        }
        return ViewModelProvider(tienda, fabrica)[NotasViewModel::class.java].also { it.abrir(9) }
    }

    private fun Montaje.borradores(): List<String> = base.walkTopDown().filter { it.isFile }.map { it.name }.toList()

    @Test
    fun laNotaSeCreaSolaCuandoCumpleYSigueEnElCompositor() = runTest {
        val m = montar()
        val vm = m.abrir()
        runCurrent()
        vm.cambiar(vm.compositor.copy(nombre = "Syl"))
        advanceUntilIdle()
        // Sin texto aún no se envía: dice lo que falta y se queda en el móvil.
        assertTrue(m.servidor.llamadas.isEmpty())
        assertEquals(EstadoDelGuardado.INCOMPLETO, vm.estado)
        assertEquals("Sin guardar: falta el texto (15 caracteres)", vm.textoDelEstado)
        assertEquals(listOf("nota-9-nueva.json"), m.borradores())
        vm.cambiar(vm.compositor.copy(descripcion = "Syl es un spren de honor."))
        advanceUntilIdle()
        assertEquals(listOf("crearNota Syl"), m.servidor.llamadas)
        assertEquals(EstadoDelGuardado.GUARDADO, vm.estado)
        // Sigue en el compositor, ya como esa nota: lo siguiente la actualiza.
        assertEquals(100, vm.compositor.id)
        assertFalse(vm.pendiente)
        assertTrue(m.borradores().isEmpty())
        assertEquals(listOf(1), vm.listadas.map { it.id })
        vm.cambiar(vm.compositor.copy(descripcion = "Syl es un spren de honor, y vuelve."))
        advanceUntilIdle()
        assertEquals(listOf("crearNota Syl", "cambiarNota 100 Syl"), m.servidor.llamadas)
        // Al salir del compositor ya guardada, se vacía para la siguiente.
        vm.salirDelCompositor()
        assertNull(vm.compositor.id)
        assertEquals(listOf(100, 1), vm.listadas.map { it.id })
    }

    @Test
    fun loEscritoAMediasVuelveSiLaAppSeCierra() = runTest {
        val m = montar()
        val vm = m.abrir()
        runCurrent()
        vm.cambiar(vm.compositor.copy(nombre = "Teoría", descripcion = "Hoid es"))
        m.tienda.clear()
        val otro = m.abrir(ViewModelStore())
        runCurrent()
        assertEquals("Teoría" to "Hoid es", otro.compositor.contenido)
        assertTrue(otro.pendiente)
    }

    @Test
    fun noSeCambiaDeNotaConUnaAMedias() = runTest {
        val m = montar()
        val vm = m.abrir()
        runCurrent()
        vm.cambiar(vm.compositor.copy(nombre = "A"))
        assertFalse(vm.editar(vm.notas.first()))
        assertEquals("A", vm.compositor.nombre)
        // Vacía, sí.
        vm.cambiar(vm.compositor.copy(nombre = ""))
        assertTrue(vm.editar(vm.notas.first()))
        assertEquals(1, vm.compositor.id)
        assertTrue(vm.listadas.isEmpty())
    }

    @Test
    fun sinConexionSeQuedaEnElMovilYSeEnviaAlVolverLaRed() = runTest {
        val m = montar()
        val vm = m.abrir()
        runCurrent()
        m.servidor.sinRed = true
        m.red.value = false
        vm.cambiar(vm.compositor.copy(nombre = "Sin red", descripcion = "Lo escrito sin conexión no se pierde."))
        advanceUntilIdle()
        assertEquals(EstadoDelGuardado.SIN_CONEXION, vm.estado)
        assertEquals(listOf("nota-9-nueva.json"), m.borradores())
        m.servidor.sinRed = false
        m.red.value = true
        advanceUntilIdle()
        assertEquals(listOf("crearNota Sin red"), m.servidor.llamadas)
        assertEquals(EstadoDelGuardado.GUARDADO, vm.estado)
        assertTrue(m.borradores().isEmpty())
    }

}
