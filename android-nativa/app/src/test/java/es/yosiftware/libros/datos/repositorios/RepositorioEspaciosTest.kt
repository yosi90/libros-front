package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.modelos.clubDeEspacio
import es.yosiftware.libros.ui.comunidad.MensajesDeEspacios
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Los espacios de la plataforma: las rutas y los cuerpos de `platform-spaces.service.ts`, y sus errores. */
class RepositorioEspaciosTest {
    private val llamadas = mutableListOf<Triple<String, String, String?>>()
    private val respuestas = mutableMapOf<String, String>()

    private val espacios = RepositorioEspacios { metodo, ruta, cuerpo ->
        llamadas += Triple(metodo, ruta, cuerpo?.toString())
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
        respuestas["POST /v1/espacios/41/entrar"] = """{"id": 41, "idExterno": "club-8", "nombre": "C", "entrada": "abierto", "dosPasos": false, "miembros": 2, "conversacion": 9,
            "yo": {"rol": "miembro", "propietario": false, "estado": "activo", "capacidades": {"gestionar": false, "invitar": true, "chat": "escribir"}}}"""
        val espacio = espacios.entrar(41)
        assertEquals(8, espacio.clubId)
        assertTrue(espacio.yo!!.invitar)
        assertEquals("escribir", espacio.yo!!.chat)
        espacios.pedirEntrar(41, "  ")
        espacios.pedirEntrar(41, " Hola ")
        espacios.salir(41)
        assertEquals(
            listOf(
                Triple("POST", "/v1/espacios/41/entrar", "{}"),
                Triple("POST", "/v1/espacios/41/solicitudes", "{}"),
                Triple("POST", "/v1/espacios/41/solicitudes", """{"mensaje":"Hola"}"""),
                Triple("DELETE", "/v1/espacios/41/miembros/yo", null),
            ),
            llamadas,
        )
    }

    @Test
    fun invitarYLasBandejas() = runTest {
        respuestas["GET /v1/personas?q=ana%20mar%C3%ADa"] = """{"personas": [{"id": "c1", "alias": "ana", "nombre": null, "avatar": {"miniatura": "/v1/perfiles/c1/avatar/miniatura?v=2"}}, {"id": "c2", "alias": "x", "borrada": true}]}"""
        respuestas["GET /v1/espacios/invitaciones"] = """{"invitaciones": [{"id": 5, "espacio": {"id": 41, "idExterno": "club-8", "nombre": "C", "dosPasos": true}, "de": {"cuenta": "c9", "nombre": "Eva"}, "rol": "miembro", "nombreRol": "Miembro", "caduca": "2026-11-01T00:00:00Z"}]}"""
        val personas = espacios.buscarPersonas(" ana maría ")
        assertEquals(listOf("@ana"), personas.map { it.visible })
        espacios.invitar(41, cuenta = "c1", rol = "moderacion")
        espacios.invitar(41, correo = " a@b.es ")
        assertEquals(JSONObject("""{"cuenta": "c1", "rol": "moderacion"}""").toString(), JSONObject(llamadas[1].third!!).toString())
        assertEquals("""{"correo":"a@b.es"}""", llamadas[2].third)
        val recibida = espacios.invitaciones().single()
        assertEquals(8, recibida.clubId)
        assertEquals("Eva", recibida.de)
        assertTrue(recibida.dosPasos)
        espacios.resolverSolicitud(41, 3, aprobar = true)
        espacios.resolverSolicitud(41, 4, aprobar = false)
        assertEquals("/v1/espacios/41/solicitudes/3/aprobar", llamadas[4].second)
        assertEquals("/v1/espacios/41/solicitudes/4/rechazar", llamadas[5].second)
    }

    @Test
    fun losErroresDeLosEspaciosAntesQueElTextoDeLaPantalla() {
        val dosPasos = ErrorDeLibros(MensajesDeEspacios.DOS_PASOS, "Texto de la plataforma", textoDelServidor = "Texto de la plataforma")
        assertEquals(
            "Este club exige la verificación en dos pasos. Actívala en tu cuenta de Yosiftware y vuelve a intentarlo.",
            MensajesDeEspacios.de(dosPasos, "No se ha podido completar la solicitud."),
        )
        val otro = ErrorDeLibros("algo_raro", "Frase del servidor", textoDelServidor = "Frase del servidor")
        assertEquals("No se ha podido enviar la invitación.", MensajesDeEspacios.de(otro, "No se ha podido enviar la invitación."))
        assertEquals("Frase del servidor", MensajesDeEspacios.deEspacioOProducto(otro, "No se ha podido abandonar el club."))
    }
}
