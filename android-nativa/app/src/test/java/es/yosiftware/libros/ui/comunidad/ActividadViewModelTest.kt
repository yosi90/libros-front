package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.repositorios.RepositorioNovedades
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
import java.time.ZoneId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La Actividad de Comunidad contra una plataforma falsa: el feed, «Descubrir», los «me gusta» y los comentarios. */
@OptIn(ExperimentalCoroutinesApi::class)
class ActividadViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Plataforma {
        val respuestas = mutableMapOf<String, String>()
        val fallos = mutableMapOf<String, ErrorSesion>()
        val llamadas = mutableListOf<String>()
        val novedades = RepositorioNovedades { metodo, ruta, cuerpo ->
            val clave = "$metodo $ruta"
            llamadas += clave + (cuerpo?.let { " $it" } ?: "")
            fallos[clave]?.let { throw it }
            respuestas[clave] ?: ""
        }
    }

    private fun novedad(id: Int, meGusta: Int = 1, propio: Boolean = false, relacion: String = "amistad") = """
        {"id": $id, "persona": {"id": "c1", "alias": "ana", "nombre": "Ana", "avatar": {"miniatura": "/v1/perfiles/c1/avatar/miniatura?v=2"}},
         "texto": "ha empezado a leer «Dune»", "enlace": null, "imagen": null, "creada": "2026-10-25T10:00:00Z",
         "meGusta": {"total": $meGusta, "propio": $propio}, "comentarios": 0, "relacion": "$relacion", "cabecera": null}
    """.trimIndent()

    private fun TestScope.montar(): Pair<Plataforma, ActividadViewModel> {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val plataforma = Plataforma()
        return plataforma to ActividadViewModel(ambito, plataforma.novedades)
    }

    @Test
    fun elFeedSePaginaSinRepetirYVacioEnsenaDescubrir() = runTest {
        val (p, vm) = montar()
        p.respuestas["GET /v1/novedades?limite=20"] = """{"novedades": [${novedad(1)}, ${novedad(2)}], "cursor": "c2"}"""
        p.respuestas["GET /v1/novedades?limite=20&cursor=c2"] = """{"novedades": [${novedad(2)}, ${novedad(3)}], "cursor": null}"""
        vm.recargar()
        runCurrent()
        vm.cargarMas()
        runCurrent()
        assertEquals(listOf(1L, 2L, 3L), vm.lista.map { it.id })
        assertNull(vm.cursor)
        assertEquals("Ana", vm.lista[0].persona.visible)

        val (p2, vacio) = montar()
        p2.respuestas["GET /v1/novedades?limite=20"] = """{"novedades": [], "cursor": null}"""
        p2.respuestas["GET /v1/novedades/descubrir"] = """{"novedades": [${novedad(9)}]}"""
        vacio.recargar()
        runCurrent()
        assertTrue(vacio.cargada)
        assertEquals(listOf(9L), vacio.descubrir.map { it.id })
    }

    @Test
    fun elMeGustaSeVeAlMomentoYVuelveAtrasSiFalla() = runTest {
        val (p, vm) = montar()
        p.respuestas["GET /v1/novedades?limite=20"] = """{"novedades": [${novedad(1)}], "cursor": null}"""
        vm.recargar()
        runCurrent()
        p.fallos["PUT /v1/novedades/1/me-gusta"] = ErrorSesion.deLaPlataforma(429, """{"error": "Demasiadas peticiones seguidas.", "code": "demasiadas_peticiones"}""")
        vm.alternarMeGusta(vm.lista[0])
        assertEquals(2, vm.lista[0].meGusta)
        assertTrue(vm.lista[0].meGustaPropio)
        runCurrent()
        assertEquals(1, vm.lista[0].meGusta)
        assertFalse(vm.lista[0].meGustaPropio)
        assertEquals("Demasiadas peticiones seguidas.", vm.error)
        p.fallos.clear()
        vm.alternarMeGusta(vm.lista[0])
        runCurrent()
        assertTrue(vm.lista[0].meGustaPropio)
        assertTrue(vm.meGustaEnCurso.isEmpty())
    }

    @Test
    fun comentarSumaYBorrarResta() = runTest {
        val (p, vm) = montar()
        p.respuestas["GET /v1/novedades?limite=20"] = """{"novedades": [${novedad(1)}], "cursor": null}"""
        p.respuestas["GET /v1/novedades/1/comentarios"] = """{"comentarios": [], "cursor": null}"""
        p.respuestas["POST /v1/novedades/1/comentarios"] = """{"id": 5, "persona": {"id": "c9", "alias": "yo", "nombre": null}, "texto": "Me encantó", "creado": "2026-10-25T11:00:00Z", "propio": true}"""
        vm.recargar()
        runCurrent()
        vm.alternarComentarios(vm.lista[0])
        runCurrent()
        vm.escribir(vm.lista[0], " Me encantó ")
        vm.comentar(vm.lista[0])
        runCurrent()
        assertTrue(p.llamadas.any { it.startsWith("POST /v1/novedades/1/comentarios") && it.contains("\"texto\":\"Me encantó\"") })
        assertEquals(1, vm.lista[0].comentarios)
        val comentario = vm.comentarios[1L]!!.lista.single()
        assertEquals("@yo", comentario.persona.visible)
        assertTrue(vm.puedeBorrar(vm.lista[0], comentario))
        assertFalse(vm.puedeBorrar(vm.lista[0], comentario.copy(propio = false)))
        vm.borrarComentario(vm.lista[0], comentario)
        runCurrent()
        assertEquals(0, vm.lista[0].comentarios)
        vm.alternarComentarios(vm.lista[0])
        assertNull(vm.comentarios[1L])
    }

    @Test
    fun laFechaComoLaWeb() {
        assertEquals("25 oct 2026, 11:00", fechaDeNovedad("2026-10-25T10:00:00Z", ZoneId.of("Europe/Madrid")))
    }
}
