package es.yosiftware.libros.ui.libro

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Escena
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.repositorios.CapituloAGuardar
import es.yosiftware.libros.datos.repositorios.EscenaAGuardar
import es.yosiftware.libros.datos.repositorios.ServidorDeCapitulos
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import java.io.File
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * El autoguardado del capítulo. El caso que lo motivó: el propietario escribió, cerró la APK del todo y perdió media
 * escena. Aquí lo escrito va al borrador a los 0,4 s, al servidor a los 1,8 s, y si la app se cierra entre medias se
 * recupera al volver.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CapituloViewModelTest {
    @get:Rule
    val temporal = TemporaryFolder()

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private val libro = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Partes": [], "Interludios": [],
         "Capitulos": [{"Id": 1, "Nombre": "Uno", "Orden": 1, "Pagina": 1, "PaginaFinal": 11, "Escenas": [
             {"Id": 7, "Nombre": "La carta", "Descripcion": "Una carta ordinaria le llegó a Citra.", "Id_Localizacion": 4,
              "PersonajesDetalle": [{"Id": 2, "Nombrado": false}]}]}],
         "Personajes": [{"Id": 1, "Nombre": "Faraday"}, {"Id": 2, "Nombre": "Citra"}],
         "Localizaciones": [{"Id": 4, "Nombre": "Sin localización"}]}
    """.trimIndent()))

    private class ServidorFalso : ServidorDeCapitulos {
        val llamadas = mutableListOf<String>()
        var fallar = false
        private var siguienteId = 100

        private fun <T> anotar(llamada: String, respuesta: () -> T): T {
            if (fallar) throw IOException("Sin conexión")
            llamadas += llamada
            return respuesta()
        }

        private fun capitulo(id: Int, c: CapituloAGuardar) = Capitulo(id, c.nombre, c.orden, c.pagina, c.paginaFinal, false, null, emptyList())
        private fun escena(id: Int, e: EscenaAGuardar) = Escena(id, e.nombre, e.descripcion, e.idLocalizacion, null, e.personajes, null, null)

        override suspend fun crearCapitulo(libroId: Int, capitulo: CapituloAGuardar) = anotar("crearCapitulo ${capitulo.nombre}") { capitulo(siguienteId++, capitulo) }
        override suspend fun cambiarCapitulo(id: Int, capitulo: CapituloAGuardar) = anotar("cambiarCapitulo $id ${capitulo.nombre}") { capitulo(id, capitulo) }
        override suspend fun crearCapituloDeInterludio(interludioId: Int, capitulo: CapituloAGuardar) = anotar("crearCapituloDeInterludio") { capitulo(siguienteId++, capitulo) }
        override suspend fun cambiarCapituloDeInterludio(id: Int, capitulo: CapituloAGuardar) = anotar("cambiarCapituloDeInterludio $id") { capitulo(id, capitulo) }
        override suspend fun crearEscena(capituloId: Int, escena: EscenaAGuardar) = anotar("crearEscena $capituloId ${escena.nombre}") { escena(siguienteId++, escena) }
        override suspend fun crearEscenaDeInterludio(capituloId: Int, escena: EscenaAGuardar) = anotar("crearEscenaDeInterludio") { escena(siguienteId++, escena) }
        override suspend fun cambiarEscena(id: Int, escena: EscenaAGuardar) = anotar("cambiarEscena $id ${escena.nombre}") { escena(id, escena) }
        override suspend fun borrarEscena(id: Int) = anotar("borrarEscena $id") { true }
    }

    private class Montaje(val ambito: AmbitoDeCuenta, val servidor: ServidorFalso, val base: File, val tienda: ViewModelStore)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        return Montaje(ambito, ServidorFalso(), temporal.newFolder("borradores"), ViewModelStore())
    }

    /** Un ViewModel en su tienda, como en la app: al «matar la app» se limpia la tienda. */
    private fun Montaje.abrir(tienda: ViewModelStore = this.tienda): CapituloViewModel {
        val fabrica = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = CapituloViewModel(ambito, servidor, Avisador.Mudo, base) as T
        }
        return ViewModelProvider(tienda, fabrica)[CapituloViewModel::class.java].also { it.abrir(libro, VistaDelLibro.DeCapitulo(1)) }
    }

    private fun Montaje.borrador(): File? = base.walkTopDown().firstOrNull { it.name == "capitulo-9-capitulo-1.json" }

    private fun CapituloViewModel.escena() = capitulo!!.escenas[0]

    @Test
    fun cadaCambioVaAlBorradorYLuegoAlServidor() = runTest {
        val m = montar()
        val vm = m.abrir()
        vm.cambiarEscena(vm.escena().clave) { it.copy(nombre = "La carta de Citra") }
        advanceTimeBy(500)
        assertTrue(m.borrador()!!.readText().contains("La carta de Citra"))
        assertTrue(m.servidor.llamadas.isEmpty())
        advanceTimeBy(1500)
        runCurrent()
        assertEquals(listOf("cambiarEscena 7 La carta de Citra"), m.servidor.llamadas)
        assertEquals(null, m.borrador())
        assertEquals(EstadoDelGuardado.GUARDADO, vm.estado)
    }

    @Test
    fun siLaAppSeCierraAntesDeEnviarLoEscritoVuelveYSeEnvia() = runTest {
        val m = montar()
        val vm = m.abrir()
        vm.cambiarEscena(vm.escena().clave) { it.copy(nombre = "Lo que casi se pierde") }
        advanceTimeBy(500)
        // Se cierra la app del todo antes del autoguardado.
        m.tienda.clear()
        advanceTimeBy(5000)
        assertTrue(m.servidor.llamadas.isEmpty())
        // Al volver a abrirla, otro ViewModel recupera el borrador y lo envía.
        val otro = m.abrir(ViewModelStore())
        assertEquals("Lo que casi se pierde", otro.escena().nombre)
        runCurrent()
        assertEquals(listOf("cambiarEscena 7 Lo que casi se pierde"), m.servidor.llamadas)
        assertEquals(null, m.borrador())
    }

    @Test
    fun alPasarASegundoPlanoSeEscribeYSeEnviaEnElActo() = runTest {
        val m = montar()
        val vm = m.abrir()
        vm.cambiarEscena(vm.escena().clave) { it.copy(nombre = "Sin esperar") }
        vm.guardarAhora()
        assertTrue(m.borrador()!!.readText().contains("Sin esperar"))
        runCurrent()
        assertEquals(listOf("cambiarEscena 7 Sin esperar"), m.servidor.llamadas)
    }

    @Test
    fun unaEscenaAMediasEsperaEnElBorradorSinFrenarLoDemas() = runTest {
        val m = montar()
        val vm = m.abrir()
        assertTrue(vm.anadirEscena())
        vm.cambiar { it.copy(nombre = "Uno, revisado") }
        advanceTimeBy(2000)
        runCurrent()
        assertEquals(listOf("cambiarCapitulo 1 Uno, revisado"), m.servidor.llamadas)
        assertEquals(EstadoDelGuardado.INCOMPLETO, vm.estado)
        assertTrue(m.borrador()!!.readText().contains("Escena 2"))
        // En cuanto tiene un personaje, se crea y el borrador se va.
        vm.asignarPersonaje(vm.capitulo!!.escenas[1].clave, 1, nombrado = false)
        advanceTimeBy(2000)
        runCurrent()
        assertEquals("crearEscena 1 Escena 2", m.servidor.llamadas.last())
        assertEquals(EstadoDelGuardado.GUARDADO, vm.estado)
        assertEquals(null, m.borrador())
    }

    @Test
    fun conElServidorCaidoElBorradorSeQueda() = runTest {
        val m = montar()
        m.servidor.fallar = true
        val vm = m.abrir()
        vm.cambiarEscena(vm.escena().clave) { it.copy(nombre = "Sin conexión") }
        advanceTimeBy(2000)
        runCurrent()
        assertEquals(EstadoDelGuardado.ERROR, vm.estado)
        assertTrue(m.borrador()!!.readText().contains("Sin conexión"))
        assertFalse(m.servidor.llamadas.any())
    }
}
