package es.yosiftware.libros.datos.cuenta

import es.yosiftware.sesion.Cuenta
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Motivo
import java.io.File
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

fun conSesion(id: String) = EstadoSesion.ConSesion(Cuenta(id, "alias-$id", null, true, "activa", false), null)

/** El ámbito de la cuenta (CAMBIO_DE_CUENTA.md): identidad, generación, trabajos y persistencia por cuenta. */
@OptIn(ExperimentalCoroutinesApi::class)
class AmbitoDeCuentaTest {
    // `escuchar` recoge la sesión en el hilo principal.
    @Before
    fun principal() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private fun TestScope.ambito(activa: String? = null) =
        AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { activa })

    @Test
    fun cadaCuentaNuevaSubeLaGeneracionAunqueVuelvaLaMisma() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        assertNull(ambito.identidad.value)
        ambito.alCambiarEstado(conSesion("A"))
        val conA = ambito.actual()
        assertEquals(Identidad("qa", "A", conA), ambito.identidad.value)
        ambito.alCambiarEstado(conSesion("B"))
        ambito.alCambiarEstado(conSesion("A"))
        // A → B → A: es una identidad nueva, con otra generación.
        assertEquals("A", ambito.identidad.value?.cuentaId)
        assertNotEquals(conA, ambito.actual())
        assertEquals(conA + 2, ambito.actual())
    }

    @Test
    fun pasarPorComprobandoOSinSesionTerminaLaIdentidad() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        ambito.alCambiarEstado(conSesion("A"))
        val conA = ambito.actual()
        ambito.alCambiarEstado(EstadoSesion.Comprobando)
        assertNull(ambito.identidad.value)
        ambito.alCambiarEstado(conSesion("A"))
        assertEquals(conA + 2, ambito.actual())
        ambito.alCambiarEstado(EstadoSesion.SinSesion(Motivo("sesion_cerrada", "Se ha cerrado la sesión.")))
        assertNull(ambito.identidad.value)
        assertEquals(conA + 3, ambito.actual())
    }

    @Test
    fun laMismaCuentaOSinConexionNoCambianNada() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        ambito.alCambiarEstado(conSesion("A"))
        val conA = ambito.actual()
        ambito.alCambiarEstado(conSesion("A"))
        ambito.alCambiarEstado(EstadoSesion.SinConexion(Motivo("sin_conexion", "Sin red")))
        assertEquals(conA, ambito.actual())
        assertEquals("A", ambito.identidad.value?.cuentaId)
    }

    @Test
    fun alArrancarSinConexionEsLaCuentaActivaGuardada() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito(activa = "A")
        ambito.alCambiarEstado(EstadoSesion.Comprobando)
        ambito.alCambiarEstado(EstadoSesion.SinConexion(Motivo("sin_conexion", "Sin red")))
        assertEquals("A", ambito.identidad.value?.cuentaId)
    }

    @Test
    fun loTardioSeDescartaEnAByVueltaAA() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        ambito.alCambiarEstado(conSesion("A"))
        val respuesta = CompletableDeferred<String>()
        val lectura = async { runCatching { ambito.mientrasSeaLaMisma { respuesta.await() } } }
        // Mientras se espera la respuesta de A, la persona pasa a B y vuelve a A.
        ambito.alCambiarEstado(conSesion("B"))
        ambito.alCambiarEstado(conSesion("A"))
        respuesta.complete("datos de la primera A")
        assertTrue(lectura.await().exceptionOrNull() is RespuestaDeOtraCuenta)
        // Lo que empieza con la A de ahora sí llega.
        assertEquals("nuevo", ambito.mientrasSeaLaMisma { "nuevo" })
    }

    @Test
    fun cambiarDeCuentaCancelaLosTrabajosDeLaAnterior() = runTest(UnconfinedTestDispatcher()) {
        val ambito = ambito()
        ambito.alCambiarEstado(conSesion("A"))
        val trabajo = ambito.alcance.launch { awaitCancellation() }
        val oidas = mutableListOf<Identidad?>()
        val dejar = ambito.alCambiar { oidas += it }
        ambito.alCambiarEstado(conSesion("B"))
        runCurrent()
        assertTrue(trabajo.isCancelled)
        assertEquals(listOf("B"), oidas.map { it?.cuentaId })
        // El alcance nuevo funciona.
        val otro = ambito.alcance.launch { awaitCancellation() }
        assertTrue(otro.isActive)
        otro.cancel()
        dejar()
        ambito.alCambiarEstado(conSesion("C"))
        assertEquals(1, oidas.size)
    }

    @Test
    fun loGuardadoVaPorEntornoYCuenta() = runTest(UnconfinedTestDispatcher()) {
        val base = File("privado")
        val ambito = ambito()
        assertNull(ambito.carpeta(base))
        assertNull(ambito.clave("borrador"))
        ambito.alCambiarEstado(conSesion("A"))
        val deA = ambito.carpeta(base)!!
        val claveDeA = ambito.clave("borrador")!!
        ambito.alCambiarEstado(conSesion("B"))
        val deB = ambito.carpeta(base)!!
        assertNotEquals(deA, deB)
        assertNotEquals(claveDeA, ambito.clave("borrador"))
        assertEquals(File(base, "qa"), deA.parentFile)
        assertTrue(claveDeA.startsWith("qa:"))
        // El id de la cuenta no aparece en la ruta, y A vuelve a su misma carpeta al volver.
        assertTrue("A" !in deA.name)
        ambito.alCambiarEstado(conSesion("A"))
        assertEquals(deA, ambito.carpeta(base))
        // Otro entorno, otra carpeta.
        val produccion = AmbitoDeCuenta("produccion", backgroundScope).apply { alCambiarEstado(conSesion("A")) }
        assertNotEquals(deA, produccion.carpeta(base))
    }

    @Test
    fun escuchaElEstadoDeLaSesion() = runTest(UnconfinedTestDispatcher()) {
        val estados = MutableStateFlow<EstadoSesion>(EstadoSesion.Comprobando)
        val ambito = ambito()
        ambito.escuchar(estados)
        estados.value = conSesion("A")
        assertEquals("A", ambito.identidad.value?.cuentaId)
        estados.value = conSesion("B")
        assertEquals("B", ambito.identidad.value?.cuentaId)
    }

    @Test
    fun exigirLanzaSiLaGeneracionCambio() {
        var actual = 3L
        val generacion = Generacion { actual }
        generacion.exigir(3)
        actual = 4
        try {
            generacion.exigir(3)
            fail("Tenía que descartarse")
        } catch (_: RespuestaDeOtraCuenta) {
        }
    }
}
