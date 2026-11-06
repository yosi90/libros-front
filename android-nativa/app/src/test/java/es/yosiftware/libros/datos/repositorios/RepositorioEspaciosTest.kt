package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.cuenta.CorreoSinConfirmar
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.RespuestaDeOtraCuenta
import es.yosiftware.libros.datos.modelos.clubDeEspacio
import es.yosiftware.libros.datos.modelos.clubId
import es.yosiftware.libros.datos.modelos.visible
import es.yosiftware.libros.ui.comunidad.MensajesDeEspacios
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.SesionYosiftware
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * Los espacios de la plataforma con la librería (`sesion.espacios` y `sesion.social`, 1.10.0): qué llamada hace cada
 * cosa, lo propio de Libros (el club de un espacio, el nombre visible, sin las cuentas borradas) y sus errores.
 */
class RepositorioEspaciosTest {
    private val llamadas = mutableListOf<Triple<String, String, String?>>()
    private val respuestas = mutableMapOf<String, String>()
    private var fallo: ErrorSesion? = null

    private val espacios = espaciosFalsos { metodo, ruta, cuerpo ->
        llamadas += Triple(metodo, ruta, cuerpo?.toString())
        fallo?.let { throw it }
        respuestas["$metodo $ruta"].orEmpty()
    }

    @Test
    fun elClubDeUnEspacio() {
        assertEquals(12, clubDeEspacio("club-12"))
        assertNull(clubDeEspacio("mazo-12"))
        assertNull(clubDeEspacio("club-0"))
        assertNull(clubDeEspacio(null))
    }

    @Test
    fun entrarPedirYSalir() = runTest {
        respuestas["POST /v1/espacios/41/entrar"] = """{"id": 41, "idExterno": "club-8", "web": {"clave": "libros", "nombre": "Libros"}, "nombre": "C", "entrada": "abierto", "dosPasos": false, "miembros": 2, "conversacion": 9,
            "yo": {"rol": "miembro", "propietario": false, "estado": "activo", "capacidades": {"gestionar": false, "invitar": true, "chat": "escribir"}}}"""
        respuestas["POST /v1/espacios/41/solicitudes"] = """{"id": 3, "cuenta": "yo", "alias": "yo", "creada": "2026-11-06T10:00:00Z"}"""
        val espacio = espacios.entrar(41)
        assertEquals(8, espacio.clubId)
        assertTrue(espacio.yo!!.invitar)
        assertEquals("escribir", espacio.yo!!.chat)
        espacios.pedirEntrar(41, "  ")
        assertEquals(3L, espacios.pedirEntrar(41, " Hola ").id)
        espacios.retirarMiSolicitud(41)
        espacios.salir(41)
        assertEquals(
            listOf(
                Triple("POST", "/v1/espacios/41/entrar", null),
                Triple("POST", "/v1/espacios/41/solicitudes", """{"mensaje":null}"""),
                Triple("POST", "/v1/espacios/41/solicitudes", """{"mensaje":"Hola"}"""),
                Triple("DELETE", "/v1/espacios/41/solicitudes/mia", null),
                Triple("DELETE", "/v1/espacios/41/miembros/yo", null),
            ),
            llamadas,
        )
    }

    @Test
    fun invitarYLasBandejas() = runTest {
        respuestas["GET /v1/personas?q=ana+mar%C3%ADa"] = """{"personas": [
            {"id": "c1", "alias": "ana", "nombre": null, "avatar": {"version": 2, "url": "/v1/perfiles/c1/avatar?v=2", "miniatura": "/v1/perfiles/c1/avatar/miniatura?v=2"}},
            {"id": "c2", "alias": "cuenta-borrada", "nombre": "Cuenta borrada", "borrada": true}]}"""
        respuestas["GET /v1/espacios/invitaciones"] = """{"invitaciones": [{"id": 5, "espacio": {"id": 41, "idExterno": "club-8", "nombre": "C", "dosPasos": true}, "web": {"clave": "libros", "nombre": "Libros"},
            "de": {"cuenta": "c9", "nombre": "Eva"}, "rol": "miembro", "nombreRol": "Miembro", "caduca": "2026-11-01T00:00:00Z"}]}"""
        val personas = espacios.buscarPersonas(" ana maría ")
        assertEquals(listOf("@ana"), personas.map { it.visible })
        // La miniatura de la librería ya es la dirección completa: la pantalla no le pone delante la API.
        assertEquals("${EspaciosFalsos.API}/v1/perfiles/c1/avatar/miniatura?v=2", personas.single().avatar?.miniatura)
        espacios.invitar(41, cuenta = "c1", rol = "moderacion")
        espacios.invitar(41, correo = " a@b.es ")
        assertEquals(JSONObject("""{"cuenta": "c1", "rol": "moderacion"}""").toString(), JSONObject(llamadas[1].third!!).toString())
        assertEquals("""{"correo":"a@b.es"}""", llamadas[2].third)
        val recibida = espacios.invitaciones().single()
        assertEquals(8, recibida.clubId)
        assertEquals("Eva", recibida.deNombre)
        assertTrue(recibida.dosPasos)
        espacios.resolverSolicitud(41, 3, aprobar = true)
        espacios.resolverSolicitud(41, 4, aprobar = false)
        assertEquals("/v1/espacios/41/solicitudes/3/aprobar", llamadas[4].second)
        assertEquals("/v1/espacios/41/solicitudes/4/rechazar", llamadas[5].second)
    }

    @Test
    fun cuentaCambiadaSeDescartaEnSilencio() = runTest {
        fallo = ErrorSesion("cuenta_cambiada", "Has cambiado de cuenta mientras se cargaba. Vuelve a intentarlo.")
        // Es una cancelación (`RespuestaDeOtraCuenta`): `cargar` y `intentar` no la convierten en un error que se enseña.
        try {
            espacios.invitaciones()
            fail("Tenía que descartarse")
        } catch (_: RespuestaDeOtraCuenta) {
        }
    }

    @Test
    fun elCorreoSinConfirmarAbreLaHojaDelCodigo() = runTest {
        val pedido = backgroundScope.async(start = CoroutineStart.UNDISPATCHED) { CorreoSinConfirmar.pedido.first() }
        fallo = ErrorSesion.deLaPlataforma(403, """{"error": "Confirma tu correo para usar los clubes.", "code": "correo_sin_confirmar"}""")
        val error = runCatching { espacios.mios() }.exceptionOrNull()
        runCurrent()
        assertTrue(pedido.isCompleted)
        assertEquals("Confirma tu correo para usar los clubes.", MensajesDeEspacios.de(ErrorDeLibros.de(error!!), "No se ha podido cargar."))
    }

    @Test
    fun sinSesionNoSeLlamaALaPlataforma() = runTest {
        val sinSesion = RepositorioEspacios(null as SesionYosiftware?)
        val error = ErrorDeLibros.de(runCatching { sinSesion.mios() }.exceptionOrNull()!!)
        assertEquals(ErrorDeLibros.SIN_SESION, error.codigo)
        assertEquals("Entra con tu cuenta de Yosiftware.", MensajesDeEspacios.de(error, "No se ha podido cargar."))
    }

    @Test
    fun seEnsenaLaFraseDeLaPlataforma() {
        // Los errores de los espacios ya llegan con «club» (el backend lo declara): sin tabla de frases.
        val lleno = ErrorDeLibros.de(ErrorSesion.deLaPlataforma(409, """{"error": "Este club ya tiene 2000 miembros.", "code": "espacio_lleno"}"""))
        assertEquals("Este club ya tiene 2000 miembros.", MensajesDeEspacios.de(lleno, "No se ha podido completar la solicitud."))
        val restringida = ErrorSesion.deLaPlataforma(
            403,
            """{"error": "Tienes limitada la comunidad hasta el 02/11/2026 a las 18:30. Lo tienes explicado en Tu cuenta › Moderación.", "code": "cuenta_restringida",
                "detalle": {"alcance": "comunidad", "hasta": "2026-11-02T17:30:00Z"}}""",
        )
        assertEquals("comunidad", restringida.restriccion?.alcance)
        assertEquals(
            "Tienes limitada la comunidad hasta el 02/11/2026 a las 18:30. Lo tienes explicado en Tu cuenta › Moderación.",
            MensajesDeEspacios.de(ErrorDeLibros.de(restringida), "No se ha podido enviar la invitación."),
        )
        // Sin frase (una respuesta que no se entiende), el texto de la pantalla.
        assertEquals("No se ha podido enviar la invitación.", MensajesDeEspacios.de(ErrorDeLibros.respuestaNoValida(), "No se ha podido enviar la invitación."))
    }
}
