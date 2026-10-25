package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.red.ApiFalsa
import es.yosiftware.libros.datos.repositorios.RepositorioClubes
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import es.yosiftware.libros.datos.repositorios.RepositorioEstadisticas
import es.yosiftware.libros.datos.repositorios.RepositorioLibro
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El detalle de un club: quién es quién, qué se carga, entrar y esperar a Libros, perder el acceso y los formularios. */
@OptIn(ExperimentalCoroutinesApi::class)
class ClubViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private val madrid = ZoneId.of("Europe/Madrid")

    private class Montaje(val api: ApiFalsa, val plataforma: MutableMap<String, String>, val llamadas: MutableList<String>, val acceso: CentroDeAccesoViewModel, val vm: ClubViewModel) {
        val salidas = mutableListOf<String?>()
    }

    private fun club(visibilidad: String = "abierto", propietario: Int = 5, miembros: String = """[{"Id": 5, "Nombre": "Yo", "Rol": "propietario"}]""") = """
        {"success": true, "Club": {"Id": 8, "EspacioId": 41, "ConversacionId": 9, "Nombre": "Club QA", "Visibilidad": "$visibilidad",
         "PropietarioId": $propietario, "MiembrosDetalle": $miembros, "Metricas": {"MiembrosActivos": 1, "Publicaciones": 0}}}
    """.trimIndent()

    private fun TestScope.montar(miId: Int = 5): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val api = ApiFalsa()
        val plataforma = mutableMapOf<String, String>()
        val llamadas = mutableListOf<String>()
        val espacios = RepositorioEspacios { metodo, ruta, _ ->
            llamadas += "$metodo $ruta"
            plataforma["$metodo $ruta"] ?: throw ErrorSesion.deLaPlataforma(404, """{"error": "No", "code": "espacio_no_encontrado"}""")
        }
        val clubes = RepositorioClubes(api.cliente)
        val estadisticas = RepositorioEstadisticas(api.cliente, RepositorioColeccion(api.cliente), RepositorioLibro(api.cliente))
        val ahora = Instant.parse("2026-10-25T10:00:00Z")
        val acceso = CentroDeAccesoViewModel(ambito, espacios) { ahora }
        val vm = ClubViewModel(ambito, 8, clubes, espacios, estadisticas, acceso, miId = { miId }, universos = { emptyList() },
            esperas = listOf(1_000L, 1_000L), zona = { madrid }, ahora = { ahora })
        return Montaje(api, plataforma, llamadas, acceso, vm).also { m -> vm.alSalir = { m.salidas += it } }
    }

    private fun ApiFalsa.conSecciones() {
        responde("GET /clubes-lectura/8/lecturas", """{"Lecturas": []}""")
        responde("GET /clubes-lectura/8/progreso", """{"Progresos": []}""")
        responde("GET /clubes-lectura/8/hitos", """{"Hitos": []}""")
        responde("GET /clubes-lectura/8/eventos", """{"Eventos": []}""")
        responde("GET /clubes-lectura/8/debates", """{"Debates": []}""")
        responde("GET /clubes-lectura/8/encuestas", """{"Encuestas": []}""")
        responde("GET /clubes-lectura/8/publicaciones", """{"Publicaciones": [], "SiguienteCursor": null}""")
        responde("GET /estadisticas/comunidad/clubes/8", """{"Club": {"Id": 8, "Nombre": "Club QA"}, "UmbralPrivacidad": 3, "AutoresMasLeidos": [{"Nombre": "Sanderson", "Lectores": 3, "LibrosLeidos": 4}]}""")
    }

    @Test
    fun quienTieneLaPropiedadVeTodoYPuedeGestionar() = runTest {
        val m = montar()
        m.api.responde("GET /clubes-lectura/8", club())
        m.api.conSecciones()
        m.plataforma["GET /v1/espacios/41"] = """{"id": 41, "idExterno": "club-8", "nombre": "Club QA", "entrada": "abierto", "yo": {"estado": "activo", "propietario": true, "capacidades": {"invitar": true, "chat": "escribir"}}}"""
        m.plataforma["GET /v1/espacios/41/invitaciones"] = """{"invitaciones": []}"""
        m.vm.recargar()
        runCurrent()
        assertTrue(m.vm.esPropietario)
        assertTrue(m.vm.esMiembro)
        assertTrue(m.vm.puedeGestionar)
        assertTrue(m.vm.puedeInvitar)
        assertTrue(m.vm.chatDisponible)
        assertFalse(m.vm.puedeUnirse)
        assertEquals("", m.vm.errorDeSeccion)
        assertEquals(listOf("Sanderson"), m.vm.autores.map { it.etiqueta })
        assertEquals(1, m.api.pedidasA("GET /clubes-lectura/8/publicaciones").size)
    }

    @Test
    fun quienNoEsMiembroSoloPideLoPublicoYAlEntrarEsperaALibros() = runTest {
        val m = montar(miId = 7)
        m.api.responde("GET /clubes-lectura/8", club())
        m.api.conSecciones()
        m.api.responde("GET /clubes-lectura/mios", """{"TieneClubes": false, "Total": 0, "Clubes": []}""")
        m.vm.recargar()
        runCurrent()
        assertFalse(m.vm.esMiembro)
        assertTrue(m.vm.puedeUnirse)
        assertTrue(m.api.pedidasA("GET /clubes-lectura/8/lecturas").isEmpty())
        assertEquals(1, m.api.pedidasA("GET /estadisticas/comunidad/clubes/8").size)

        m.plataforma["POST /v1/espacios/41/entrar"] = """{"id": 41, "idExterno": "club-8", "nombre": "Club QA", "entrada": "abierto", "yo": {"estado": "activo", "capacidades": {"invitar": false, "chat": "escribir"}}}"""
        m.vm.unirseOSolicitar()
        runCurrent()
        assertEquals("Ya eres miembro de Club QA. Libros tarda unos segundos en abrirte el club.", m.vm.mensajeDeAccion)
        assertEquals(EsperaAlFeed.ESPERANDO, m.vm.espera)
        assertTrue(m.acceso.entradaReciente(8))
        assertFalse(m.vm.puedeUnirse)

        // Libros se entera en la segunda pregunta: ya es miembro y se carga todo.
        m.api.responde("GET /clubes-lectura/8", club(miembros = """[{"Id": 5, "Nombre": "Yo", "Rol": "propietario"}, {"Id": 7, "Nombre": "Ana", "Rol": "miembro"}]"""))
        advanceTimeBy(1_001)
        runCurrent()
        assertEquals(EsperaAlFeed.ESPERANDO, m.vm.espera)
        m.api.responde("GET /clubes-lectura/mios", """{"TieneClubes": true, "Total": 1, "Clubes": [{"Id": 8, "Nombre": "Club QA"}]}""")
        advanceTimeBy(1_001)
        runCurrent()
        assertEquals(EsperaAlFeed.NADA, m.vm.espera)
        assertTrue(m.vm.esMiembro)
        assertEquals(1, m.api.pedidasA("GET /clubes-lectura/8/lecturas").size)
    }

    @Test
    fun siLibrosNoSeEnteraLaEsperaSeAgota() = runTest {
        val m = montar(miId = 7)
        m.api.responde("GET /clubes-lectura/8", club())
        m.api.conSecciones()
        m.api.responde("GET /clubes-lectura/mios", """{"TieneClubes": false, "Total": 0, "Clubes": []}""")
        m.vm.recargar()
        runCurrent()
        m.vm.empezarEspera()
        advanceTimeBy(2_500)
        runCurrent()
        assertEquals(EsperaAlFeed.AGOTADA, m.vm.espera)
    }

    @Test
    fun sinAccesoYSinEntradaRecienteSeCierraElClubDiciendoPorQue() = runTest {
        val m = montar()
        m.api.responde("GET /clubes-lectura/8", """{"error": "Sin acceso", "code": "club_access_unavailable"}""", 404)
        m.vm.recargar()
        runCurrent()
        assertEquals(listOf<String?>("Este club ya no está disponible para tu cuenta."), m.salidas)
    }

    @Test
    fun conEntradaRecienteSeEsperaEnLugarDeCerrar() = runTest {
        val m = montar()
        m.acceso.marcarEntrada(8)
        m.api.responde("GET /clubes-lectura/8", """{"error": "Sin acceso", "code": "club_access_unavailable"}""", 404)
        m.api.responde("GET /clubes-lectura/mios", """{"TieneClubes": false, "Total": 0, "Clubes": []}""")
        m.vm.recargar()
        runCurrent()
        assertTrue(m.salidas.isEmpty())
        assertEquals(EsperaAlFeed.ESPERANDO, m.vm.espera)
    }

    @Test
    fun unClubCerradoAbreLaSolicitudYLaRecuerda() = runTest {
        val m = montar(miId = 7)
        m.api.responde("GET /clubes-lectura/8", club(visibilidad = "cerrado"))
        m.api.conSecciones()
        m.vm.recargar()
        runCurrent()
        m.vm.unirseOSolicitar()
        assertTrue(m.vm.hojaDeSolicitud)
        m.plataforma["POST /v1/espacios/41/solicitudes"] = "{}"
        m.vm.escribirMensajeDeSolicitud("Hola")
        m.vm.enviarSolicitud()
        runCurrent()
        assertFalse(m.vm.hojaDeSolicitud)
        assertTrue(m.vm.solicitudPropia)
        assertEquals(1, m.acceso.solicitudesEnviadas)
        assertTrue(m.vm.mensajeDeAccion.startsWith("Tu solicitud se ha enviado."))
    }

    @Test
    fun losFormulariosNoSeMandanDosVecesYValidanAntes() = runTest {
        val m = montar()
        m.api.responde("GET /clubes-lectura/8", club())
        m.api.conSecciones()
        m.vm.recargar()
        runCurrent()
        m.api.responde("POST /clubes-lectura/8/debates", """{"success": true}""")
        m.vm.escribirTituloDeDebate("Capítulo 1")
        m.vm.escribirContenidoDeDebate("¿Qué os pareció?")
        m.vm.escribirSpoilerFin("120")
        m.vm.crearDebate()
        m.vm.crearDebate()
        runCurrent()
        assertEquals(1, m.api.pedidasA("POST /clubes-lectura/8/debates").size)
        val cuerpo = JSONObject(m.api.cuerpos[m.api.pedidas.indexOf("POST /clubes-lectura/8/debates")]!!)
        assertTrue(cuerpo.getJSONObject("Spoiler").isNull("PaginaInicio"))
        assertEquals("", m.vm.tituloDeDebate)

        m.vm.escribirPregunta("¿Siguiente libro?")
        m.vm.escribirOpciones("Uno\n\n")
        m.vm.elegirCierre(LocalDateTime.of(2026, 10, 26, 10, 0))
        m.vm.crearEncuesta()
        assertTrue(m.api.pedidasA("POST /clubes-lectura/8/encuestas").isEmpty())
        m.vm.escribirOpciones("Uno\nDos")
        m.vm.elegirCierre(LocalDateTime.of(2026, 10, 25, 9, 0))
        m.vm.crearEncuesta()
        assertEquals("La fecha de cierre debe ser futura.", m.vm.errorDeEncuesta)

        m.vm.elegirInicioDeEvento(LocalDateTime.of(2026, 11, 1, 18, 0))
        m.vm.elegirFinDeEvento(LocalDateTime.of(2026, 11, 1, 17, 0))
        m.vm.escribirTituloDeEvento("Tertulia")
        m.vm.crearEvento()
        assertEquals("La fecha final no puede ser anterior al inicio.", m.vm.errorDeCalendario)
    }

    @Test
    fun unaDenunciaRepetidaLoDiceYSinMotivoNoSeEnvia() = runTest {
        val m = montar(miId = 7)
        m.api.responde("GET /clubes-lectura/8", club())
        m.api.conSecciones()
        m.vm.recargar()
        runCurrent()
        m.vm.denunciarClub()
        m.vm.enviarDenuncia("   ")
        assertNull(m.vm.denuncia)
        assertTrue(m.api.pedidasA("POST /comunidad/denuncias").isEmpty())
        m.api.responde("POST /comunidad/denuncias", """{"error": "Ya existe", "code": "duplicate_content_report"}""", 409)
        m.vm.denunciarClub()
        m.vm.enviarDenuncia("Spam")
        runCurrent()
        assertEquals("Ya tienes una denuncia pendiente sobre este club.", m.vm.mensajeDeAccion)
    }
}
