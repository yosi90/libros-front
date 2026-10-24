package es.yosiftware.libros.datos.cuenta

import es.yosiftware.libros.datos.ErrorDeLibros
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Un ViewModel de ejemplo sobre [ViewModelDeCuenta]: enseña los libros de la cuenta. Las pantallas de los hitos 8 a 11
 * siguen este patrón.
 */
private class LibrosDeLaCuenta(ambito: AmbitoDeCuenta, private val leer: suspend (String) -> List<String>) : ViewModelDeCuenta(ambito) {
    var libros: List<String> = emptyList()
    var error: ErrorDeLibros? = null
    val cambios = mutableListOf<String?>()

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        cambios += identidad?.cuentaId
        libros = emptyList()
        error = null
        identidad?.let { recargar(it.cuentaId) }
    }

    fun recargar(cuenta: String) {
        cargar({ leer(cuenta) }, alFallar = { error = it }) { libros = it }
    }

    fun limpiar() = onCleared()
}

@OptIn(ExperimentalCoroutinesApi::class)
class ViewModelDeCuentaTest {
    @Before
    fun principal() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private fun TestScope.ambito() = AmbitoDeCuenta("qa", backgroundScope)

    @Test
    fun conCadaCuentaVaciaYCargaLaSuya() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        val vm = LibrosDeLaCuenta(ambito) { cuenta -> listOf("libro de $cuenta") }
        ambito.alCambiarEstado(conSesion("A"))
        assertEquals(listOf("libro de A"), vm.libros)
        ambito.alCambiarEstado(conSesion("B"))
        assertEquals(listOf("libro de B"), vm.libros)
        assertEquals(listOf("A", "B"), vm.cambios)
        vm.limpiar()
    }

    @Test
    fun laRespuestaTardiaDeLaPrimeraANoSePintaTrasAByVueltaAA() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        val pendientes = mutableListOf<CompletableDeferred<List<String>>>()
        val vm = LibrosDeLaCuenta(ambito) { CompletableDeferred<List<String>>().also { pendientes += it }.await() }
        ambito.alCambiarEstado(conSesion("A"))
        val primeraA = pendientes.single()
        ambito.alCambiarEstado(conSesion("B"))
        ambito.alCambiarEstado(conSesion("A"))
        // La red de la primera A termina ahora: no se pinta, aunque la cuenta sea otra vez A.
        primeraA.complete(listOf("de la primera A"))
        assertEquals(emptyList<String>(), vm.libros)
        // La de la A de ahora, sí.
        pendientes.last().complete(listOf("de la segunda A"))
        assertEquals(listOf("de la segunda A"), vm.libros)
        // La de B, que se canceló al volver a A, tampoco.
        pendientes[1].complete(listOf("de B"))
        assertEquals(listOf("de la segunda A"), vm.libros)
        assertEquals(listOf("A", "B", "A"), vm.cambios)
        vm.limpiar()
    }

    @Test
    fun unErrorTardioTampocoSeEnsena() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        val pendiente = CompletableDeferred<List<String>>()
        var primera = true
        val vm = LibrosDeLaCuenta(ambito) {
            if (primera) {
                primera = false
                pendiente.await()
            } else {
                throw ErrorDeLibros.sinConexion()
            }
        }
        ambito.alCambiarEstado(conSesion("A"))
        ambito.alCambiarEstado(conSesion("B"))
        // El error de la carga de B sí se enseña; el de A, que llega después, no.
        assertTrue(vm.error?.sinConexion == true)
        vm.error = null
        pendiente.completeExceptionally(ErrorDeLibros.sinSesion())
        assertEquals(null, vm.error)
        vm.limpiar()
    }

    @Test
    fun alLimpiarDejaDeEscuchar() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        val vm = LibrosDeLaCuenta(ambito) { listOf(it) }
        vm.limpiar()
        ambito.alCambiarEstado(conSesion("A"))
        assertTrue(vm.cambios.isEmpty())
    }
}
