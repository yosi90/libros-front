package es.yosiftware.libros.ui.perfil

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.ActividadReciente
import es.yosiftware.libros.datos.modelos.GrupoDeReportes
import es.yosiftware.libros.datos.modelos.MetricasDeUniversos
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
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
import org.junit.Assert.assertTrue
import org.junit.Test

/** El Perfil: lo que carga al entrar, los fallos, reenviar una petición devuelta y el cambio de cuenta. */
@OptIn(ExperimentalCoroutinesApi::class)
class PerfilViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private fun peticion(id: Int, estado: String, tipo: String = "libro") = PeticionDeCatalogo.de(
        JSONObject("""{"Id": $id, "TipoEntidad": "$tipo", "Accion": "alta", "Payload": {"Texto": "Hola", "ISBN": "9788466658904"}, "Estado": "$estado"}"""),
    )

    private class FuenteFalsa : FuenteDelPerfil {
        var fallar = false
        var peticionesDelServidor = listOf<PeticionDeCatalogo>()
        val respondidas = mutableListOf<Pair<Int, JSONObject>>()
        var esperaAlResponder: CompletableDeferred<Unit>? = null
        var llamadas = 0

        private fun <T> o(valor: T): T {
            llamadas++
            if (fallar) throw IOException("Sin conexión")
            return valor
        }

        override suspend fun actividadReciente() = o(listOf(ActividadReciente.de(JSONObject("""{"Tipo": "libro", "Id": 1, "Nombre": "Elantris", "Autores": [{"Id": 1, "Nombre": "Brandon Sanderson"}]}"""))))
        override suspend fun metricas() = o(MetricasDeUniversos.de(JSONObject("""{"Resumen": {"Libros": {"EnMarcha": 2, "Leidos": 5}}}""")))
        override suspend fun peticiones() = o(peticionesDelServidor)
        override suspend fun reportes() = o(emptyList<GrupoDeReportes>())
        override suspend fun responder(id: Int, payload: JSONObject): PeticionDeCatalogo {
            esperaAlResponder?.await()
            respondidas += id to payload
            return o(PeticionDeCatalogo.de(JSONObject("""{"Id": $id, "TipoEntidad": "libro", "Accion": "alta", "Payload": {}, "Estado": "pendiente"}""")))
        }
    }

    private class AvisosAnotados : Avisador {
        val anotados = mutableListOf<String>()
        override fun exito(mensaje: String) { anotados += "éxito: $mensaje" }
        override fun error(mensaje: String) { anotados += "error: $mensaje" }
        override fun deError(error: ErrorDeLibros, generico: String) { anotados += "error: $generico" }
    }

    private class Montaje(val sesion: SesionFalsa, val fuente: FuenteFalsa, val avisos: AvisosAnotados, val vm: PerfilViewModel)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val fuente = FuenteFalsa()
        val avisos = AvisosAnotados()
        return Montaje(sesion, fuente, avisos, PerfilViewModel(ambito, fuente, avisos))
    }

    @Test
    fun noCargaHastaQueSeAbreYAlAbrirloCargaTodo() = runTest {
        val m = montar()
        m.fuente.peticionesDelServidor = listOf(peticion(1, "pendiente"))
        runCurrent()
        assertEquals(0, m.fuente.llamadas)
        assertTrue(m.vm.cargandoActividad)
        m.vm.alEntrar()
        runCurrent()
        assertEquals(4, m.fuente.llamadas)
        assertEquals("Elantris", m.vm.actividad.single().nombre)
        assertEquals(2, m.vm.enMarcha)
        assertEquals(5, m.vm.leidos)
        assertEquals(1, m.vm.peticiones.size)
        assertFalse(m.vm.cargandoActividad || m.vm.cargandoPeticiones || m.vm.cargandoReportes)
    }

    @Test
    fun unFalloNoSeConfundeConUnaListaVacia() = runTest {
        val m = montar()
        m.fuente.fallar = true
        m.vm.alEntrar()
        runCurrent()
        assertTrue(m.vm.falloActividad)
        assertTrue(m.vm.falloPeticiones)
        assertTrue(m.vm.falloReportes)
        assertEquals(0, m.vm.enMarcha)
        m.fuente.fallar = false
        m.vm.cargarPeticiones()
        runCurrent()
        assertFalse(m.vm.falloPeticiones)
    }

    @Test
    fun reenviarSinTextoAvisaYNoEnvia() = runTest {
        val m = montar()
        val devuelta = peticion(4, "devuelta")
        m.vm.escribirRespuesta(4, "   ")
        m.vm.reenviar(devuelta)
        runCurrent()
        assertTrue(m.fuente.respondidas.isEmpty())
        assertEquals(listOf("error: Añade un comentario para reenviar la petición."), m.avisos.anotados)
    }

    @Test
    fun reenviarUnaVezAunqueSePulseDosYCambiarLaPeticion() = runTest {
        val m = montar()
        m.fuente.peticionesDelServidor = listOf(peticion(4, "devuelta"), peticion(5, "pendiente"))
        m.vm.alEntrar()
        runCurrent()
        val espera = CompletableDeferred<Unit>()
        m.fuente.esperaAlResponder = espera
        m.vm.escribirRespuesta(4, " Ya está corregido ")
        m.vm.reenviar(m.vm.peticiones[0])
        m.vm.reenviar(m.vm.peticiones[0])
        runCurrent()
        assertTrue(4 in m.vm.reenviando)
        espera.complete(Unit)
        runCurrent()
        assertEquals(1, m.fuente.respondidas.size)
        assertEquals("Ya está corregido", m.fuente.respondidas.single().second.getString("Comentario"))
        assertEquals("pendiente", m.vm.peticiones[0].estado)
        assertFalse(4 in m.vm.respuestas)
        assertTrue(m.vm.reenviando.isEmpty())
        assertEquals(listOf("éxito: Petición reenviada"), m.avisos.anotados)
    }

    @Test
    fun siElReenvioFallaSeConservaLoEscrito() = runTest {
        val m = montar()
        m.fuente.peticionesDelServidor = listOf(peticion(4, "devuelta", tipo = "otro"))
        m.vm.alEntrar()
        runCurrent()
        m.fuente.fallar = true
        m.vm.escribirRespuesta(4, "Respuesta")
        m.vm.reenviar(m.vm.peticiones[0])
        runCurrent()
        assertEquals("Respuesta", m.vm.respuestas[4])
        assertTrue(m.vm.reenviando.isEmpty())
        assertEquals(listOf("error: No se pudo completar la acción"), m.avisos.anotados)
        assertEquals(setOf("Texto"), m.fuente.respondidas.single().second.keys().asSequence().toSet())
    }

    @Test
    fun atrasVuelveAlResumenYAlCambiarDeCuentaSeVacia() = runTest {
        val m = montar()
        m.fuente.peticionesDelServidor = listOf(peticion(4, "devuelta"))
        m.vm.alEntrar()
        runCurrent()
        m.vm.abrir(SeccionDelPerfil.PETICIONES)
        m.vm.escribirRespuesta(4, "de A")
        assertTrue(m.vm.volver())
        assertFalse(m.vm.volver())
        m.vm.abrir(SeccionDelPerfil.REPORTES)
        m.sesion.cuentas.value = listOf(guardada("A"), guardada("B", activa = true))
        m.sesion.estado.value = conSesion("B")
        runCurrent()
        assertEquals(SeccionDelPerfil.RESUMEN, m.vm.seccion)
        assertTrue(m.vm.peticiones.isEmpty())
        assertTrue(m.vm.respuestas.isEmpty())
        assertTrue(m.vm.actividad.isEmpty())
        assertEquals(0, m.vm.enMarcha)
    }
}
