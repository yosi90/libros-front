package es.yosiftware.libros.ui.catalogo

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.datos.red.ApiFalsa
import es.yosiftware.libros.datos.repositorios.RepositorioCatalogo
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioPeticiones
import es.yosiftware.libros.ui.componentes.Avisador
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
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * «Corregir y reenviar» una petición devuelta desde Mis peticiones: el modal de petición del Catálogo, relleno con lo
 * enviado, que reenvía la misma (`PATCH …/mias/{id}/responder`) en vez de crear otra (`catalog.component.spec.ts`).
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ReenvioDePeticionTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class AvisosAnotados : Avisador {
        val anotados = mutableListOf<String>()
        override fun exito(mensaje: String) { anotados += "éxito: $mensaje" }
        override fun error(mensaje: String) { anotados += "error: $mensaje" }
        override fun deError(error: ErrorDeLibros, generico: String) { anotados += "error: $generico" }
    }

    private class Montaje(val api: ApiFalsa, val avisos: AvisosAnotados, val vm: CatalogoViewModel)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val api = ApiFalsa()
        val avisos = AvisosAnotados()
        val vm = CatalogoViewModel(ambito, RepositorioCatalogo(api.cliente), RepositorioColeccion(api.cliente), RepositorioPeticiones(api.cliente), avisos)
        runCurrent()
        api.pedidas.clear()
        api.cuerpos.clear()
        avisos.anotados.clear()
        return Montaje(api, avisos, vm)
    }

    private val devuelta = PeticionDeCatalogo.de(
        JSONObject(
            """{"Id": 21, "TipoEntidad": "libro", "Accion": "alta", "EntidadId": null, "Estado": "devuelta", "ComentarioResolucion": "El ISBN no es válido.",
               "Payload": {"Nombre": "La guardia del fin", "ISBN": "0", "FechaPublicacion": "2008", "Comentario": "Era el primero."}}""",
        ),
    )

    @Test
    fun seRellenaConLoEnviadoYNoConsultaElCupo() = runTest {
        val m = montar()
        m.vm.corregirYReenviar(devuelta)
        runCurrent()
        val abierta = m.vm.peticion!!
        assertEquals("Corregir y reenviar", abierta.formulario.titulo)
        assertEquals("Reenviar", abierta.formulario.boton)
        assertEquals("La guardia del fin", abierta.formulario.nombre)
        assertEquals("0", abierta.formulario.isbn)
        assertEquals("2008", abierta.formulario.fechaPublicacion)
        assertEquals("Era el primero.", abierta.formulario.comentario)
        assertEquals(21, abierta.formulario.reenvio)
        // El reenvío no cuenta para el límite de activas: ni se consulta ni se enseña.
        assertFalse(abierta.consultandoActivas)
        assertNull(abierta.activas)
        assertTrue(m.api.pedidas.isEmpty())
    }

    @Test
    fun unIsbnDeRellenoNoSeEnviaYAlCorregirloSeReenviaSinCrearOtra() = runTest {
        val m = montar()
        m.api.responde("PATCH /peticiones/catalogo/mias/21/responder", """{"Id": 21, "TipoEntidad": "libro", "Accion": "alta", "Estado": "pendiente", "Payload": {}}""")
        val recibidas = mutableListOf<PeticionDeCatalogo>()
        m.vm.corregirYReenviar(devuelta) { recibidas += it }

        m.vm.enviarPeticion()
        runCurrent()
        assertTrue(m.api.pedidas.isEmpty())
        assertEquals("Indica un ISBN-10 o ISBN-13 válido para el alta.", m.vm.peticion!!.formulario.errorDeIsbn)

        m.vm.cambiarPeticion(m.vm.peticion!!.formulario.copy(isbn = "978-0-306-40615-7"))
        m.vm.enviarPeticion()
        runCurrent()
        assertEquals(listOf("PATCH /peticiones/catalogo/mias/21/responder"), m.api.pedidas)
        assertTrue(m.api.pedidasA("POST /peticiones/catalogo").isEmpty())
        assertEquals(
            mapOf("Nombre" to "La guardia del fin", "ISBN" to "978-0-306-40615-7", "FechaPublicacion" to "2008", "Comentario" to "Era el primero."),
            JSONObject(m.api.cuerpos.single()!!).getJSONObject("Payload").let { payload -> payload.keys().asSequence().associateWith { payload.getString(it) } },
        )
        assertEquals("pendiente", recibidas.single().estado)
        assertEquals(listOf("éxito: Petición reenviada"), m.avisos.anotados)
    }

    @Test
    fun alTerminarSeCierraYVuelveAlModoNormal() = runTest {
        val m = montar()
        m.api.responde("PATCH /peticiones/catalogo/mias/21/responder", """{"Id": 21, "TipoEntidad": "libro", "Accion": "alta", "Estado": "pendiente", "Payload": {}}""")
        m.api.responde("GET /peticiones/catalogo/mias", "[]")
        m.api.responde("POST /peticiones/catalogo", """{"Id": 30, "Estado": "pendiente"}""", 201)
        val recibidas = mutableListOf<PeticionDeCatalogo>()
        m.vm.corregirYReenviar(devuelta) { recibidas += it }
        m.vm.cambiarPeticion(m.vm.peticion!!.formulario.copy(isbn = "9780306406157"))
        m.vm.enviarPeticion()
        runCurrent()
        assertNull(m.vm.peticion)

        // La siguiente petición es una nueva: con su título, su cupo y su «Enviar», y se crea.
        m.vm.pedirNuevo()
        runCurrent()
        val nueva = m.vm.peticion!!
        assertEquals("Pedir nuevo libro", nueva.formulario.titulo)
        assertEquals("Enviar", nueva.formulario.boton)
        assertNull(nueva.formulario.reenvio)
        assertEquals("", nueva.formulario.nombre)
        assertEquals(0, nueva.activas)
        m.vm.cambiarPeticion(nueva.formulario.copy(nombre = "Siega", isbn = "9788408284154"))
        m.vm.enviarPeticion()
        runCurrent()
        assertEquals(1, m.api.pedidasA("POST /peticiones/catalogo").size)
        assertEquals(1, m.api.pedidasA("PATCH ").size)
        assertEquals(1, recibidas.size)
        assertNull(m.vm.peticion)
    }

    @Test
    fun cancelarDejaLaPeticionComoEstaba() = runTest {
        val m = montar()
        val recibidas = mutableListOf<PeticionDeCatalogo>()
        m.vm.corregirYReenviar(devuelta) { recibidas += it }
        m.vm.cerrarPeticion()
        runCurrent()
        assertNull(m.vm.peticion)
        assertTrue(m.api.pedidas.isEmpty())
        assertTrue(recibidas.isEmpty())
        // Las de tipo `otro` no se abren aquí: solo se reenvían con un comentario.
        m.vm.corregirYReenviar(PeticionDeCatalogo.de(JSONObject("""{"Id": 5, "TipoEntidad": "otro", "Accion": "comentario", "Estado": "devuelta", "Payload": {"Texto": "Hola"}}""")))
        assertNull(m.vm.peticion)
    }
}
