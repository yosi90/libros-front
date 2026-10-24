package es.yosiftware.libros.ui.cuenta

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.FuenteDePerfiles
import es.yosiftware.libros.datos.cuenta.PerfilPublico
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Motivo
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

private const val API = "https://qa-cuentas-api.yosiftware.es"

private fun perfil(id: String) = PerfilPublico(id, "alias-$id", "Nombre de $id", "$API/v1/perfiles/$id/avatar/miniatura?v=1")

/**
 * La limpieza al cambiar de cuenta (ecosistema-kit/CAMBIO_DE_CUENTA.md), con la sesión real conectada al ámbito como en
 * `LibrosApp` (`AmbitoDeCuenta.escuchar(sesion.estado)`) pero con una fuente de estado falsa: A → B → A, el cierre, la
 * revocación, sin conexión y las respuestas tardías. Lo que se ve de la cuenta es lo de [PerfilesViewModel] (el nombre y
 * el avatar del shell y del panel), el primer ViewModel de cuenta de la app.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class LimpiezaAlCambiarDeCuentaTest {
    @Before
    fun principal() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Montaje(val sesion: SesionFalsa, val ambito: AmbitoDeCuenta, val vm: PerfilesViewModel, val pedidos: MutableList<String>)

    /** Como en la app: el ámbito escucha la sesión antes de que nada la cambie, y el ViewModel, el ámbito. */
    private fun TestScope.montar(fuente: (String) -> FuenteDePerfiles? = { null }, leer: (suspend (String) -> PerfilPublico)? = null): Montaje {
        val sesion = SesionFalsa().apply { estado.value = EstadoSesion.Comprobando }
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { sesion.cuentas.value.firstOrNull { it.activa }?.id })
        ambito.escuchar(sesion.estado)
        val pedidos = mutableListOf<String>()
        val lectura = FuenteDePerfiles { id ->
            pedidos += id
            leer?.invoke(id) ?: perfil(id)
        }
        val vm = PerfilesViewModel(ambito, sesion.cuentas, lectura, API)
        return Montaje(sesion, ambito, vm, pedidos)
    }

    private fun Montaje.entrar(id: String, vararg otras: String) {
        sesion.cuentas.value = listOf(guardada(id, activa = true)) + otras.map { guardada(it) }
        sesion.estado.value = conSesion(id)
    }

    @Test
    fun deAaBaAseVaciaYSeLeeLaDeCadaUna() = runTest(UnconfinedTestDispatcher()) {
        val m = montar()
        m.entrar("A")
        assertEquals(setOf("A"), m.vm.perfiles.keys)
        assertEquals("Nombre de A", m.vm.nombre("A", "alias-A"))

        // Elegir B pasa por Comprobando: lo de A deja de verse en ese momento, antes de que llegue B.
        m.sesion.estado.value = EstadoSesion.Comprobando
        assertTrue(m.vm.perfiles.isEmpty())
        assertNull(m.ambito.identidad.value)
        m.entrar("B", "A")
        assertEquals(setOf("A", "B"), m.vm.perfiles.keys)

        // Y de vuelta a A, sin pasar por Comprobando: otra identidad y otra lectura.
        val generacionDeB = m.ambito.actual()
        m.entrar("A", "B")
        assertTrue(m.ambito.actual() > generacionDeB)
        assertEquals(listOf("A", "B", "A", "A", "B"), m.pedidos)
    }

    @Test
    fun laRespuestaTardiaDeAnoSeVeConBniAlVolverAA() = runTest(UnconfinedTestDispatcher()) {
        val pendientes = mutableMapOf<String, MutableList<CompletableDeferred<PerfilPublico>>>()
        val m = montar(leer = { id -> CompletableDeferred<PerfilPublico>().also { pendientes.getOrPut(id) { mutableListOf() } += it }.await() })
        m.entrar("A")
        val primeraA = pendientes.getValue("A").single()
        m.entrar("B")
        // La de A llega cuando ya está B: no se pinta.
        primeraA.complete(perfil("A").copy(nombre = "A de antes"))
        assertTrue(m.vm.perfiles.isEmpty())
        m.entrar("A")
        // Ni cuando vuelve A: era de la generación anterior.
        assertTrue(m.vm.perfiles.isEmpty())
        pendientes.getValue("A").last().complete(perfil("A"))
        assertEquals("Nombre de A", m.vm.de("A")?.nombre)
        // Las de B (la que se pidió al cambiar la lista, aún con A, y la de la identidad de B), que se cancelaron al
        // cambiar, tampoco aparecen.
        pendientes.getValue("B").forEach { it.complete(perfil("B")) }
        assertNull(m.vm.de("B"))
    }

    @Test
    fun salirVaciaYSinIdentidadNoSePideNada() = runTest(UnconfinedTestDispatcher()) {
        val m = montar()
        m.entrar("A")
        m.sesion.cuentas.value = emptyList()
        m.sesion.estado.value = EstadoSesion.SinSesion()
        assertTrue(m.vm.perfiles.isEmpty())
        assertNull(m.ambito.identidad.value)
        // Sin sesión, una cuenta guardada no se lee (no hay token): se enseña su alias y la miniatura pública.
        m.sesion.cuentas.value = listOf(guardada("B"))
        assertEquals(listOf("A"), m.pedidos)
        assertEquals("alias-B", m.vm.nombre("B", "alias-B"))
        assertEquals("$API/v1/perfiles/B/avatar/miniatura", m.vm.avatar("B"))
    }

    @Test
    fun unaRevocacionVaciaComoSalir() = runTest(UnconfinedTestDispatcher()) {
        val m = montar()
        m.entrar("A", "B")
        val antes = m.ambito.actual()
        // Al volver a primer plano, `comprobar()` ve que la sesión se cerró desde la web social.
        m.sesion.cuentas.value = listOf(guardada("A", caducada = true), guardada("B"))
        m.sesion.estado.value = EstadoSesion.SinSesion(Motivo("sesion_no_valida", "Tu sesión se ha cerrado."))
        assertTrue(m.vm.perfiles.isEmpty())
        assertNull(m.ambito.identidad.value)
        assertTrue(m.ambito.actual() > antes)
    }

    @Test
    fun sinConexionSigueSiendoLaMismaCuenta() = runTest(UnconfinedTestDispatcher()) {
        val m = montar()
        m.entrar("A")
        val generacion = m.ambito.actual()
        m.sesion.estado.value = EstadoSesion.SinConexion(Motivo("sin_conexion", "Sin conexión."))
        assertEquals("A", m.ambito.identidad.value?.cuentaId)
        assertEquals(generacion, m.ambito.actual())
        assertEquals("Nombre de A", m.vm.de("A")?.nombre)
    }

    @Test
    fun alArrancarSinRedEsLaCuentaActivaGuardada() = runTest(UnconfinedTestDispatcher()) {
        val m = montar()
        m.sesion.cuentas.value = listOf(guardada("A", activa = true))
        m.sesion.estado.value = EstadoSesion.SinConexion(Motivo("sin_conexion", "Sin conexión."))
        assertEquals("A", m.ambito.identidad.value?.cuentaId)
    }

    @Test
    fun unaCuentaNuevaEnLaListaTraeSuPerfil() = runTest(UnconfinedTestDispatcher()) {
        val m = montar()
        m.entrar("A")
        m.sesion.cuentas.value = m.sesion.cuentas.value + guardada("C")
        assertEquals(setOf("A", "C"), m.vm.perfiles.keys)
        // No se piden dos veces en la misma identidad.
        m.sesion.cuentas.value = m.sesion.cuentas.value.toList()
        assertEquals(listOf("A", "C"), m.pedidos)
    }

    @Test
    fun unPerfilSinAvatarPintaLaInicialYUnoQueFallaElAlias() = runTest(UnconfinedTestDispatcher()) {
        val m = montar(leer = { id ->
            if (id == "B") throw es.yosiftware.sesion.ErrorSesion("perfil_no_encontrado", "No existe.")
            perfil(id).copy(avatar = null, nombre = null)
        })
        m.entrar("A", "B")
        assertNull(m.vm.avatar("A"))
        assertEquals("alias-A", m.vm.nombre("A", "alias-A"))
        assertEquals("alias-B", m.vm.nombre("B", "alias-B"))
        assertEquals("$API/v1/perfiles/B/avatar/miniatura", m.vm.avatar("B"))
    }
}
