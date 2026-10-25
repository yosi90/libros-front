package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.cuenta.AlmacenEnMemoria
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.red.ClienteLibros
import es.yosiftware.libros.datos.red.TokensFalsos
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioLibro
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** El lector persistente (native-reader-session.service.ts): Atrás por las vistas, minimizar, y el libro recordado por cuenta. */
@OptIn(ExperimentalCoroutinesApi::class)
class LectorPersistenteTest {
    @Before
    fun principal() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private val siega = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Portada": "9.png", "Autores": [], "Estados": [], "Partes": [], "Interludios": [],
         "Capitulos": [{"Id": 1, "Nombre": "Uno", "Orden": 1, "Pagina": 1, "Escenas": []}]}
    """.trimIndent()))

    @Test
    fun lasVistasSeRecuerdanComoTexto() {
        listOf(
            VistaDelLibro.Estadisticas, VistaDelLibro.Notas, VistaDelLibro.Busqueda, VistaDelLibro.DeCapitulo(3, deInterludio = true),
            VistaDelLibro.NuevoCapitulo, VistaDelLibro.NuevoCapituloDeInterludio(5), VistaDelLibro.DeElemento(Elemento.CITAS, seleccionado = 8),
        ).forEach { assertEquals(it, VistaDelLibro.deTexto(VistaDelLibro.aTexto(it))) }
        assertEquals(null, VistaDelLibro.deTexto("otra"))
    }

    @Test
    fun atrasVuelvePorLasVistasMinimizaYAlVolverAEntrarElLibroSigueMinimizado() = runTest {
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        // Sin servidor: lo que se pida a la API falla como sin conexión.
        val api = ClienteLibros("http://127.0.0.1:9/", TokensFalsos())
        val almacen = AlmacenEnMemoria()
        val vm = LibroViewModel(ambito, RepositorioLibro(api), RepositorioColeccion(api), Avisador.Mudo, almacen)

        vm.mostrarMuestra(siega)
        vm.ir(VistaDelLibro.Notas)
        vm.ir(VistaDelLibro.DeCapitulo(1))
        vm.atras()
        assertEquals(VistaDelLibro.Notas, vm.vista)
        vm.atras()
        assertEquals(VistaDelLibro.Estadisticas, vm.vista)
        vm.atras()
        assertTrue(vm.minimizado)
        vm.restaurar()
        assertFalse(vm.minimizado)
        vm.ir(VistaDelLibro.DeCapitulo(1))
        vm.minimizar()

        // Se cierra la app y se vuelve a entrar con la misma cuenta: el libro vuelve minimizado, en su vista.
        val otro = LibroViewModel(ambito, RepositorioLibro(api), RepositorioColeccion(api), Avisador.Mudo, almacen)
        sesion.estado.value = conSesion("A")
        sesion.estado.value = conSesion("B")
        sesion.estado.value = conSesion("A")
        withContext(Dispatchers.Default) { repeat(100) { if (otro.abierto == null) delay(20) } }
        assertEquals(9, otro.abierto?.id)
        assertEquals("Siega", otro.abierto?.nombre)
        assertTrue(otro.minimizado)
        assertEquals(VistaDelLibro.DeCapitulo(1), otro.vista)

        // Cerrar desde la isla lo olvida.
        otro.cerrar()
        assertEquals(null, otro.abierto)
        assertEquals("", almacen.leer(ambito.clave("lector")!!))
    }
}
