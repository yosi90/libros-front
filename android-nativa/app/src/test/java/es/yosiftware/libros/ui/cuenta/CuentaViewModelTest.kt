package es.yosiftware.libros.ui.cuenta

import android.app.Activity
import es.yosiftware.libros.cuenta.OtraApp
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.ResumenNormas
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Las acciones de cada estado de la sesión (ecosistema-kit/APK.md, la tabla de estados) y del panel de cuentas. */
@OptIn(ExperimentalCoroutinesApi::class)
class CuentaViewModelTest {
    @Before
    fun principal() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    // SinSesion

    @Test
    fun entrarConContrasenaRecortaElCorreo() = runTest {
        val sesion = SesionFalsa()
        val vm = CuentaViewModel(sesion)
        vm.entrarConContrasena("  ana@correo.es ", " clave ")
        assertEquals(listOf("contrasena:ana@correo.es: clave "), sesion.llamadas)
        assertFalse(vm.ocupado)
        assertNull(vm.error)
    }

    @Test
    fun elErrorEsLaFraseDeLaPlataformaYSeOlvidaAlEscribir() = runTest {
        val sesion = SesionFalsa().apply { fallo = ErrorSesion("credenciales_no_validas", "El correo o la contraseña no son correctos.") }
        val vm = CuentaViewModel(sesion)
        vm.entrarConContrasena("ana@correo.es", "mala")
        assertEquals("El correo o la contraseña no son correctos.", vm.error)
        vm.olvidarError()
        assertNull(vm.error)
    }

    @Test
    fun enQaElErrorLlevaSuCodigo() = runTest {
        val sesion = SesionFalsa().apply { fallo = ErrorSesion("acceso_restringido", "Libros está en pruebas privadas.") }
        val vm = CuentaViewModel(sesion, mostrarCodigos = true)
        vm.entrarConContrasena("ana@correo.es", "clave")
        assertEquals("Libros está en pruebas privadas. [acceso_restringido]", vm.error)
    }

    @Test
    fun unaAccionALaVez() = runTest {
        val sesion = SesionFalsa().apply { espera = CompletableDeferred() }
        val vm = CuentaViewModel(sesion)
        vm.entrarConContrasena("ana@correo.es", "clave")
        assertTrue(vm.ocupado)
        vm.entrarConContrasena("otra@correo.es", "clave")
        vm.salir()
        assertEquals(1, sesion.llamadas.size)
        sesion.espera!!.complete(Unit)
        assertFalse(vm.ocupado)
    }

    @Test
    fun googleEnciendeElServicioYLoApagaAunqueFalle() = runTest {
        val sesion = SesionFalsa().apply { fallo = ErrorSesion("google_no_disponible", "Google no está disponible.") }
        val eventos = mutableListOf<String>()
        val vm = CuentaViewModel(sesion, alEmpezarGoogle = { eventos += "empieza" }, alTerminarGoogle = { eventos += "termina" })
        vm.entrarConGoogle(Activity())
        assertEquals(listOf("empieza", "termina"), eventos)
        assertEquals(listOf("google"), sesion.llamadas)
        assertEquals("Google no está disponible.", vm.error)
    }

    @Test
    fun cerrarLaVentanaDeGoogleNoEsUnError() = runTest {
        val sesion = SesionFalsa().apply { fallo = ErrorSesion("google_cancelado", "Has cancelado.") }
        val vm = CuentaViewModel(sesion)
        vm.entrarConGoogle(Activity())
        assertNull(vm.error)
    }

    @Test
    fun googleMientrasOcupadoNoEnciendeElServicio() = runTest {
        val sesion = SesionFalsa().apply { espera = CompletableDeferred() }
        var empezado = 0
        val vm = CuentaViewModel(sesion, alEmpezarGoogle = { empezado++ })
        vm.entrarConContrasena("ana@correo.es", "clave")
        vm.entrarConGoogle(Activity())
        assertEquals(0, empezado)
    }

    @Test
    fun sinRespuestaNoSeQuedaEsperandoParaSiempre() = runTest {
        val sesion = SesionFalsa().apply { espera = CompletableDeferred() }
        val vm = CuentaViewModel(sesion, limiteMs = 1_000)
        vm.entrarConContrasena("ana@correo.es", "clave")
        assertTrue(vm.ocupado)
        advanceTimeBy(1_001)
        assertFalse(vm.ocupado)
        assertEquals("No ha llegado respuesta. Vuelve a intentarlo.", vm.error)
    }

    @Test
    fun continuarComoSoloAlTocar() = runTest {
        val ana = OtraApp("ana", "Yosircana")
        val sesion = SesionFalsa().apply { otras = listOf(ana) }
        val vm = CuentaViewModel(sesion)
        vm.buscarOtrasApps()
        // Buscar no entra: solo ofrece.
        assertEquals(listOf(ana), vm.otrasApps)
        assertEquals(listOf("otrasApps"), sesion.llamadas)
        vm.continuarCon(ana)
        assertEquals(listOf("otrasApps", "continuarCon:ana"), sesion.llamadas)
        assertTrue(vm.otrasApps.isEmpty())
    }

    @Test
    fun siFallaContinuarComoQuedaElFormularioConElMensaje() = runTest {
        val ana = OtraApp("ana", null)
        val sesion = SesionFalsa().apply {
            otras = listOf(ana)
            fallo = ErrorSesion("ticket_no_valido", "La sesión de la otra app ya no vale.")
        }
        val vm = CuentaViewModel(sesion)
        vm.buscarOtrasApps()
        vm.continuarCon(ana)
        assertEquals("La sesión de la otra app ya no vale.", vm.error)
        assertEquals(listOf(ana), vm.otrasApps)
    }

    @Test
    fun alEntrarSeOlvidanLasOtrasApps() = runTest {
        val sesion = SesionFalsa().apply { otras = listOf(OtraApp("ana", null)) }
        val vm = CuentaViewModel(sesion)
        vm.buscarOtrasApps()
        sesion.estado.value = conSesion("A")
        assertTrue(vm.otrasApps.isEmpty())
    }

    // Los pasos de entrar

    @Test
    fun altaCodigoYBorradoLlamanALaLibreria() = runTest {
        val sesion = SesionFalsa()
        val vm = CuentaViewModel(sesion)
        vm.completarAlta("  lectora ")
        vm.enviarCodigo(" 123456 ")
        vm.conservarCuenta()
        vm.cancelar()
        assertEquals(listOf("alta:lectora", "codigo:123456", "conservar", "cancelar"), sesion.llamadas)
    }

    @Test
    fun alVolverDelNavegadorSeEntraOtraVez() = runTest {
        val sesion = SesionFalsa().apply { estado.value = EstadoSesion.AbrirEnNavegador("verificacion", "https://acceso/?gestion=x") }
        val vm = CuentaViewModel(sesion)
        // Volver a la app sin haber abierto el navegador (al pintar la pantalla) no hace nada.
        vm.alVolverDelNavegador()
        assertTrue(sesion.llamadas.isEmpty())
        vm.alAbrirElNavegador()
        vm.alVolverDelNavegador()
        assertEquals(listOf("cancelar"), sesion.llamadas)
        assertEquals("Si ya lo has hecho en el navegador, entra otra vez para terminar.", vm.aviso)
        assertFalse(vm.enElNavegador)
    }

    @Test
    fun lasNormasSeLeenSeAceptanYSeCierranAlCambiarDePaso() = runTest {
        val sesion = SesionFalsa().apply { estado.value = EstadoSesion.NormasDeUsoPendientes(ResumenNormas(1, 2, "Normas de uso"), cuenta("A")) }
        val vm = CuentaViewModel(sesion)
        vm.leerNormasDeUso()
        assertEquals("Normas de uso", vm.normas?.titulo)
        vm.aceptarNormasDeUso()
        assertNull(vm.normas)
        assertEquals(listOf("leerNormasDeUso", "aceptarNormasDeUso"), sesion.llamadas)

        // Las de Libros, con sesión: abiertas, se cierran si la sesión pasa a otro estado.
        sesion.estado.value = EstadoSesion.ConSesion(cuenta("A"), ResumenNormas(9, 1, "Normas de Libros"))
        vm.leerNormasDeLaWeb()
        assertTrue(vm.normas != null)
        sesion.estado.value = EstadoSesion.SinSesion()
        assertNull(vm.normas)
    }

    @Test
    fun sinConexionReintenta() = runTest {
        val sesion = SesionFalsa()
        val vm = CuentaViewModel(sesion)
        vm.reintentar()
        assertEquals(listOf("reintentar"), sesion.llamadas)
    }

    // Varias cuentas

    @Test
    fun anadirYCancelarVuelveALaDeAntes() = runTest {
        val sesion = SesionFalsa().apply { estado.value = conSesion("A") }
        val vm = CuentaViewModel(sesion)
        vm.anadirCuenta()
        assertTrue(vm.anadiendo)
        vm.cancelarAnadir()
        assertFalse(vm.anadiendo)
        assertEquals(listOf("anadir", "cancelarAnadir"), sesion.llamadas)
    }

    @Test
    fun alEntrarConLaNuevaYaNoSeEstaAnadiendo() = runTest {
        val sesion = SesionFalsa().apply { estado.value = conSesion("A") }
        val vm = CuentaViewModel(sesion)
        vm.anadirCuenta()
        sesion.estado.value = EstadoSesion.SinSesion()
        assertTrue(vm.anadiendo)
        sesion.estado.value = conSesion("B")
        assertFalse(vm.anadiendo)
    }

    @Test
    fun elegirOlvidarSalirYSalirDeTodas() = runTest {
        val sesion = SesionFalsa().apply { estado.value = conSesion("A") }
        val vm = CuentaViewModel(sesion)
        vm.elegirCuenta("B")
        vm.olvidarCuenta("C")
        vm.salir()
        vm.salirDeTodas()
        assertEquals(listOf("elegir:B", "olvidar:C", "salir", "salirDeTodas"), sesion.llamadas)
    }

    @Test
    fun elegirUnaCaducadaEnsenaElError() = runTest {
        val sesion = SesionFalsa().apply {
            fallo = ErrorSesion("cuenta_guardada_caducada", "La sesión de esta cuenta ha caducado. Vuelve a entrar con ella.")
        }
        val vm = CuentaViewModel(sesion)
        vm.elegirCuenta("B")
        assertEquals("La sesión de esta cuenta ha caducado. Vuelve a entrar con ella.", vm.error)
    }

    @Test
    fun sinSesionConfiguradaNoHaceNada() = runTest {
        var empezado = false
        val vm = CuentaViewModel(null, alEmpezarGoogle = { empezado = true })
        vm.entrarConContrasena("ana@correo.es", "clave")
        vm.entrarConGoogle(Activity())
        vm.buscarOtrasApps()
        vm.salirDeTodas()
        assertFalse(vm.ocupado)
        assertFalse(empezado)
        assertNull(vm.error)
    }
}
