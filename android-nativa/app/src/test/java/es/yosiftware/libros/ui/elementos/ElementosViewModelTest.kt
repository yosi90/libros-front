package es.yosiftware.libros.ui.elementos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Apodo
import es.yosiftware.libros.datos.modelos.Cita
import es.yosiftware.libros.datos.modelos.Concepto
import es.yosiftware.libros.datos.modelos.Entrada
import es.yosiftware.libros.datos.modelos.EstadoDePersonaje
import es.yosiftware.libros.datos.modelos.Evento
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.Localizacion
import es.yosiftware.libros.datos.modelos.LocalizacionDeOrganizacion
import es.yosiftware.libros.datos.modelos.Organizacion
import es.yosiftware.libros.datos.modelos.Personaje
import es.yosiftware.libros.datos.modelos.PersonajeDeOrganizacion
import es.yosiftware.libros.datos.modelos.Referencia
import es.yosiftware.libros.datos.modelos.RelacionDePersonaje
import es.yosiftware.libros.datos.repositorios.EntradaAGuardar
import es.yosiftware.libros.datos.repositorios.ServidorDeElementos
import es.yosiftware.libros.datos.repositorios.TipoDeEntidad
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.libros.ui.libro.Elemento
import es.yosiftware.libros.ui.libro.VistaDelLibro
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
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

@OptIn(ExperimentalCoroutinesApi::class)
class ElementosViewModelTest {
    @get:Rule
    val temporal = TemporaryFolder()

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private val libro = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Capitulos": [], "Partes": [], "Interludios": [],
         "Personajes": [{"Id": 12, "Nombre": "Kaladin", "Sexo": 0,
            "Apodos": [{"Id": 1, "ApodoId": 40, "Apodo": "Kaladin", "Origen": 9, "Borrado": false}, {"Id": 2, "ApodoId": 41, "Apodo": "Kal", "Origen": 9, "Borrado": false}],
            "Estados": [{"Id": 1, "EstadoId": 1, "Estado": "Vivo", "Origen": 9}],
            "Relaciones": [{"Id": 5, "RelacionId": 77, "PersonajeRelacionadoId": 5, "Parentesco": "Hermano", "Origen": 9},
                           {"Id": 6, "RelacionId": 78, "PersonajeRelacionadoId": 6, "Parentesco": "Padre", "Origen": 9}],
            "Entradas": [{"Id": 30, "Nombre": "Descripción", "Descripcion": "Un soldado de Alethkar."}, {"Id": 31, "Nombre": "Puente", "Descripcion": "Corredor del puente cuatro."}]},
                        {"Id": 5, "Nombre": "Tien"}, {"Id": 6, "Nombre": "Lirin"}],
         "Localizaciones": [{"Id": 1, "Nombre": "Sin localización"}]}
    """.trimIndent()))

    /** Un servidor falso que anota cada llamada; [fallar] hace fallar las que contengan ese texto. */
    private class Falso : ServidorDeElementos {
        val llamadas = mutableListOf<String>()
        /** También las que fallan. */
        val intentos = mutableListOf<String>()
        val fallar = mutableSetOf<String>()
        private var siguiente = 500

        private fun <T> anotar(llamada: String, respuesta: () -> T): T {
            intentos += llamada
            if (fallar.any { it in llamada }) throw IOException("falla $llamada")
            llamadas += llamada
            return respuesta()
        }

        private fun ficha(id: Int) = JSONObject().put("Id", id).put("Nombre", "x")
        override suspend fun catalogoDeEstadosDePersonaje() = listOf(Referencia(1, "Vivo"), Referencia(2, "Muerto"))
        override suspend fun catalogoDeEstadosDeLocalizacion() = listOf(Referencia(5, "Buen estado"))
        override suspend fun crearPersonaje(libroId: Int, apodo: String, sexo: Int, entradas: List<EntradaAGuardar>, idCliente: String?) =
            // Como la API: el personaje nuevo ya está «Vivo» en el libro.
            anotar("crearPersonaje $apodo $idCliente") { Personaje.de(ficha(600).put("Estados", org.json.JSONArray().put(JSONObject().put("Id", 1).put("EstadoId", 1).put("Estado", "Vivo").put("Origen", libroId)))) }
        override suspend fun personaje(id: Int, libroId: Int?) = Personaje.de(ficha(id))
        override suspend fun cambiarSexoDePersonaje(id: Int, sexo: Int) = anotar("sexo $id $sexo") { null }
        override suspend fun cambiarEstadoDePersonaje(personajeId: Int, libroId: Int, estadoId: Int) =
            anotar("estado $personajeId $estadoId") { EstadoDePersonaje.de(JSONObject().put("Id", estadoId).put("Estado", "x")) }
        override suspend fun crearRelacion(personajeId: Int, libroId: Int, relacionadoId: Int, parentesco: String, reflejada: Boolean?) =
            anotar("crearRelacion $personajeId $relacionadoId $parentesco") { RelacionDePersonaje.de(JSONObject().put("Id", relacionadoId)) }
        override suspend fun cambiarRelacion(personajeId: Int, relacionId: Int, libroId: Int?, relacionadoId: Int?, parentesco: String?, reflejada: Boolean?) =
            anotar("cambiarRelacion $personajeId $relacionId $parentesco") { RelacionDePersonaje.de(JSONObject().put("Id", relacionadoId)) }
        override suspend fun borrarRelacion(personajeId: Int, relacionId: Int) = anotar("borrarRelacion $personajeId $relacionId") { true }
        override suspend fun crearApodo(personajeId: Int, libroId: Int, apodo: String) =
            anotar("crearApodo $personajeId $apodo") { Apodo.de(JSONObject().put("Id", 1).put("ApodoId", 1).put("Apodo", apodo)) }
        override suspend fun borrarApodo(personajeId: Int, apodoId: Int) = anotar("borrarApodo $personajeId $apodoId") { true }
        override suspend fun cambiarApodoNarrativo(personajeId: Int, libroId: Int, apodo: String) = anotar("apodoNarrativo $apodo") { Personaje.de(ficha(personajeId)) }
        override suspend fun corregirApodo(personajeId: Int, libroId: Int, apodo: String) = anotar("corregirApodo $apodo") { Personaje.de(ficha(personajeId)) }
        override suspend fun crearLocalizacion(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>, estadoId: Int?) = anotar("crearLocalizacion $nombre") { Localizacion.de(ficha(siguiente++)) }
        override suspend fun cambiarLocalizacion(id: Int, libroId: Int, nombre: String, estadoId: Int?) = anotar("cambiarLocalizacion $id") { null }
        override suspend fun crearConcepto(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>) = anotar("crearConcepto $nombre") { Concepto.de(ficha(siguiente++)) }
        override suspend fun cambiarConcepto(id: Int, libroId: Int, nombre: String) = anotar("cambiarConcepto $id") { null }
        override suspend fun crearOrganizacion(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>) = anotar("crearOrganizacion $nombre") { Organizacion.de(ficha(700)) }
        override suspend fun cambiarOrganizacion(id: Int, libroId: Int, nombre: String) = anotar("cambiarOrganizacion $id") { null }
        override suspend fun personajesDeOrganizacion(id: Int, libroId: Int?) = emptyList<PersonajeDeOrganizacion>()
        override suspend fun anadirPersonajeAOrganizacion(id: Int, libroId: Int, personajeId: Int, descripcion: String) =
            anotar("vincularPersonaje $id $personajeId") { PersonajeDeOrganizacion.de(JSONObject().put("OrganizacionId", id).put("PersonajeId", personajeId).put("Descripcion", descripcion)) }
        override suspend fun cambiarPersonajeDeOrganizacion(id: Int, personajeId: Int, libroId: Int, descripcion: String) =
            anotar("cambiarVinculo $id $personajeId") { PersonajeDeOrganizacion.de(JSONObject().put("OrganizacionId", id).put("PersonajeId", personajeId).put("Descripcion", descripcion)) }
        override suspend fun quitarPersonajeDeOrganizacion(id: Int, personajeId: Int) = anotar("desvincularPersonaje $id $personajeId") { true }
        override suspend fun localizacionesDeOrganizacion(id: Int, libroId: Int?) = emptyList<LocalizacionDeOrganizacion>()
        override suspend fun anadirLocalizacionAOrganizacion(id: Int, libroId: Int, localizacionId: Int, descripcion: String) =
            anotar("vincularLugar $id $localizacionId") { LocalizacionDeOrganizacion.de(JSONObject().put("OrganizacionId", id).put("LocalizacionId", localizacionId)) }
        override suspend fun cambiarLocalizacionDeOrganizacion(id: Int, localizacionId: Int, libroId: Int, descripcion: String) =
            anotar("cambiarLugar $id $localizacionId") { LocalizacionDeOrganizacion.de(JSONObject().put("OrganizacionId", id).put("LocalizacionId", localizacionId)) }
        override suspend fun quitarLocalizacionDeOrganizacion(id: Int, localizacionId: Int) = anotar("desvincularLugar $id $localizacionId") { true }
        override suspend fun crearEvento(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>, localizacionId: Int, personajesIds: List<Int>) = anotar("crearEvento $nombre") { Evento.de(ficha(siguiente++)) }
        override suspend fun cambiarEvento(id: Int, libroId: Int, nombre: String, localizacionId: Int, personajesIds: List<Int>?) = anotar("cambiarEvento $id") { null }
        override suspend fun crearCita(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>, pagina: Int, personajeId: Int) = anotar("crearCita $nombre") { Cita.de(ficha(siguiente++)) }
        override suspend fun cambiarCita(id: Int, libroId: Int, nombre: String, pagina: Int, personajeId: Int) = anotar("cambiarCita $id") { null }
        override suspend fun crearEntradas(tipo: TipoDeEntidad, entidadId: Int, libroId: Int, entradas: List<EntradaAGuardar>) = anotar("crearEntradas $entidadId ${entradas.size}") { emptyList<Entrada>() }
        override suspend fun cambiarEntrada(id: Int, entrada: EntradaAGuardar) = anotar("cambiarEntrada $id") { Entrada.de(JSONObject().put("Id", id)) }
        override suspend fun borrarEntrada(id: Int) = anotar("borrarEntrada $id") { true }
    }

    private class Montaje(val ambito: AmbitoDeCuenta, val servidor: Falso, val tienda: ViewModelStore)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        return Montaje(ambito, Falso(), ViewModelStore())
    }

    private val base by lazy { temporal.newFolder("borradores") }

    private fun Montaje.vm(tienda: ViewModelStore = this.tienda, recargado: () -> Libro = { libro }): ElementosViewModel {
        val fabrica = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = ElementosViewModel(ambito, servidor, Avisador.Mudo, base, cargarLibro = { recargado() }) as T
        }
        return ViewModelProvider(tienda, fabrica)[ElementosViewModel::class.java]
    }

    @Test
    fun guardarLaFichaSoloEnviaLoQueCambiaConLasRelacionesPorSuFila() = runTest {
        val m = montar()
        val vm = m.vm()
        vm.abrir(libro, VistaDelLibro.DeElemento(Elemento.PERSONAJES, seleccionado = 12))
        advanceUntilIdle()
        vm.cambiar { f ->
            f.copy(
                entradas = f.entradas.map { if (it.id == 31) it.copy(descripcion = "Corredor del puente cuatro, y luego capitán.") else it },
                relaciones = f.relaciones.filter { it.idPersonaje != 6 }.map { it.copy(parentesco = "Hermano menor") },
                apodos = listOf("Capitán"),
            )
        }
        vm.guardar()
        advanceUntilIdle()
        assertEquals(
            listOf("cambiarEntrada 31", "borrarRelacion 12 78", "cambiarRelacion 12 77 Hermano menor", "borrarApodo 12 41", "crearApodo 12 Capitán"),
            m.servidor.llamadas,
        )
        assertEquals(ModoDeElementos.Lista, vm.modo)
    }

    @Test
    fun laHojaDeAltaAbreLaFichaDelNuevoOOtraHojaVacia() = runTest {
        val m = montar()
        val conConcepto = Libro.de(JSONObject("""
            {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Capitulos": [], "Partes": [], "Interludios": [],
             "Personajes": [], "Localizaciones": [{"Id": 1, "Nombre": "Sin localización"}],
             "Conceptos": [{"Id": 500, "Nombre": "Investidura", "Entradas": [{"Id": 1, "Nombre": "Descripción", "Descripcion": "x"}]}]}
        """.trimIndent()))
        val vm = m.vm(recargado = { conConcepto })
        vm.abrir(libro, VistaDelLibro.DeElemento(Elemento.CONCEPTOS, crear = true))
        advanceUntilIdle()
        assertEquals(ModoDeElementos.Alta, vm.modo)
        // «Crear»: se abre la ficha del nuevo para completarla.
        vm.cambiar { it.copy(nombre = "Investidura") }
        vm.crearDesdeLaHoja(otro = false)
        advanceUntilIdle()
        assertEquals(ModoDeElementos.Ficha(500), vm.modo)
        assertEquals("Investidura", vm.ficha?.nombre)
        // «Crear y otro»: otra hoja vacía.
        vm.volver()
        vm.abrirAlta()
        vm.cambiar { it.copy(nombre = "Esquirlada") }
        vm.crearDesdeLaHoja(otro = true)
        advanceUntilIdle()
        assertEquals(ModoDeElementos.Alta, vm.modo)
        assertEquals("", vm.ficha?.nombre)
        assertEquals(listOf("crearConcepto Investidura", "crearConcepto Esquirlada"), m.servidor.llamadas)
    }

    @Test
    fun elAltaDePersonajeReintentaConElMismoIdCliente() = runTest {
        val m = montar()
        val vm = m.vm()
        vm.abrir(libro, VistaDelLibro.DeElemento(Elemento.PERSONAJES, crear = true))
        advanceUntilIdle()
        vm.cambiar { it.copy(nombre = "Syl", sexo = 1) }
        m.servidor.fallar += "crearPersonaje"
        vm.guardar()
        advanceUntilIdle()
        m.servidor.fallar.clear()
        vm.guardar()
        advanceUntilIdle()
        val altas = m.servidor.intentos.filter { it.startsWith("crearPersonaje") }
        assertEquals(2, altas.size)
        assertTrue(altas[0].startsWith("crearPersonaje Syl "))
        assertEquals(altas[0], altas[1])
        // El estado elegido es «Vivo», que la API ya pone al crear: no se envía aparte.
        assertFalse(m.servidor.llamadas.any { it.startsWith("estado") })
        assertEquals(ModoDeElementos.Lista, vm.modo)
    }

    @Test
    fun unaOrganizacionCuyoVinculoFallaNoSeDuplicaAlReintentar() = runTest {
        val m = montar()
        val vm = m.vm()
        vm.abrir(libro, VistaDelLibro.DeElemento(Elemento.ORGANIZACIONES, crear = true))
        advanceUntilIdle()
        vm.cambiar { it.copy(nombre = "Puente cuatro", vinculos = listOf(VinculoDeOrganizacion(true, 12, "Capitán del puente cuatro"))) }
        m.servidor.fallar += "vincularPersonaje"
        vm.guardar()
        advanceUntilIdle()
        assertEquals(ModoDeElementos.Ficha(700), vm.modo)
        m.servidor.fallar.clear()
        vm.guardar()
        advanceUntilIdle()
        assertEquals(listOf("crearOrganizacion Puente cuatro", "vincularPersonaje 700 12"), m.servidor.llamadas)
    }

    @Test
    fun loEscritoEnUnaFichaVuelveSiLaAppSeCierra() = runTest {
        val m = montar()
        val vm = m.vm()
        vm.abrir(libro, VistaDelLibro.DeElemento(Elemento.PERSONAJES, seleccionado = 12))
        advanceUntilIdle()
        vm.cambiar { it.copy(apodos = it.apodos + "Bendito") }
        advanceTimeBy(500)
        m.tienda.clear()
        val otro = m.vm(ViewModelStore())
        otro.abrir(libro, VistaDelLibro.DeElemento(Elemento.PERSONAJES, seleccionado = 12))
        advanceUntilIdle()
        assertEquals(listOf("Kaladin", "Kal", "Bendito"), otro.ficha?.apodos)
        assertTrue(m.servidor.llamadas.isEmpty())
    }

    @Test
    fun seleccionadoAbreLaFichaUnaSolaVez() = runTest {
        val m = montar()
        val vm = m.vm()
        val vista = VistaDelLibro.DeElemento(Elemento.PERSONAJES, seleccionado = 12)
        vm.abrir(libro, vista)
        advanceUntilIdle()
        vm.cambiar { it.copy(sexo = 2) }
        // Llega el libro otra vez (otro guardado, el orden de personajes…): lo escrito sigue.
        vm.abrir(libro, vista)
        assertEquals(2, vm.ficha?.sexo)
        vm.volver()
        advanceUntilIdle()
        vm.abrir(libro, vista)
        assertEquals(ModoDeElementos.Lista, vm.modo)
        assertEquals(listOf("sexo 12 2"), m.servidor.llamadas)
    }
}
