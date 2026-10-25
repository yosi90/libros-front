package es.yosiftware.libros.datos.repositorios

import kotlinx.coroutines.test.runTest
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El chat de la plataforma: las rutas y los cuerpos de `platform-chat.service.ts`, y la lectura de sus respuestas. */
class RepositorioChatTest {
    private val llamadas = mutableListOf<Triple<String, String, String?>>()
    private val respuestas = mutableMapOf<String, String>()

    private val chat = RepositorioChat { metodo, ruta, cuerpo ->
        llamadas += Triple(metodo, ruta, cuerpo?.let(::ordenado))
        respuestas["$metodo $ruta"].orEmpty()
    }

    /** El cuerpo con las claves en orden alfabético: el `JSONObject` de la JVM no conserva el de inserción. */
    private fun ordenado(valor: Any?): String = when (valor) {
        is JSONObject -> valor.keys().asSequence().sorted().joinToString(",", "{", "}") { JSONObject.quote(it) + ":" + ordenado(valor.opt(it)) }
        is JSONArray -> (0 until valor.length()).joinToString(",", "[", "]") { ordenado(valor.opt(it)) }
        is String -> JSONObject.quote(valor)
        else -> valor.toString()
    }

    @Test
    fun laBandeja() = runTest {
        respuestas["GET /v1/chat/conversaciones"] = """{"conversaciones": [
            {"id": 7, "tipo": "directa", "persona": {"id": "c2", "alias": "eva", "nombre": "Eva"}, "miembros": 2, "rol": "miembro", "noLeidos": 3,
             "ultimoMensaje": {"id": 90, "conversacion": 7, "tipo": "texto", "persona": {"id": "c2", "alias": "eva"}, "texto": "Hola", "reacciones": {"total": {"❤": 2}}, "creado": "2026-10-25T10:00:00Z"},
             "permisos": {"escribir": true, "invitar": false, "administrar": false, "salir": false}},
            {"id": 8, "tipo": "web", "titulo": "Club X", "web": {"clave": "libros", "nombre": "Libros"}, "miembros": 5, "noLeidos": -1, "cerrada": true}
        ]}"""
        val conversaciones = chat.conversaciones()
        assertEquals(listOf(7L, 8L), conversaciones.map { it.id })
        val directa = conversaciones[0]
        assertEquals("Eva", directa.persona?.nombre)
        assertEquals(3, directa.noLeidos)
        assertEquals(mapOf("❤" to 2), directa.ultimoMensaje?.reacciones)
        assertTrue(directa.permisos.escribir)
        assertEquals("Libros", conversaciones[1].web?.nombre)
        assertEquals(0, conversaciones[1].noLeidos)
        assertTrue(conversaciones[1].cerrada)
        assertFalse(conversaciones[1].permisos.escribir)
    }

    @Test
    fun losMensajesConSuCursor() = runTest {
        respuestas["GET /v1/chat/conversaciones/7/mensajes?limite=50"] = """{"mensajes": [{"id": 1, "conversacion": 7, "tipo": "aviso",
            "aviso": {"codigo": "miembro.unido", "datos": {"cuenta": "c2"}, "personas": [{"id": "c2", "alias": "eva", "nombre": "Eva"}]}, "creado": "2026-10-25T09:00:00Z"}], "cursor": 1}"""
        respuestas["GET /v1/chat/conversaciones/7/mensajes?limite=50&antes=1"] = """{"mensajes": [], "cursor": null}"""
        val pagina = chat.mensajes(7)
        assertEquals("1", pagina.cursor)
        assertEquals("Eva", pagina.elementos.single().aviso?.personas?.get("c2")?.nombre)
        assertNull(chat.mensajes(7, pagina.cursor).cursor)
    }

    @Test
    fun enviarEditarReaccionarYLeer() = runTest {
        respuestas["POST /v1/chat/conversaciones/7/mensajes"] = """{"id": 91, "conversacion": 7, "tipo": "texto", "texto": "Hola", "propio": true, "idCliente": "a1", "creado": "2026-10-25T10:00:00Z"}"""
        val enviado = chat.enviar(7, "Hola", "a1", respuestaA = 90)
        assertEquals("a1", enviado.idCliente)
        assertEquals(true, enviado.propio)
        chat.enviar(7, "Otro", "a2")
        chat.editar(7, 91, "Hola!")
        chat.reaccionar(7, 91, "👍")
        chat.reaccionar(7, 91, null)
        chat.leido(7, 91)
        chat.borrar(7, 91)
        assertEquals(
            listOf(
                Triple("POST", "/v1/chat/conversaciones/7/mensajes", """{"idCliente":"a1","idRespuesta":90,"texto":"Hola"}"""),
                Triple("POST", "/v1/chat/conversaciones/7/mensajes", """{"idCliente":"a2","texto":"Otro"}"""),
                Triple("PATCH", "/v1/chat/conversaciones/7/mensajes/91", """{"texto":"Hola!"}"""),
                Triple("PUT", "/v1/chat/conversaciones/7/mensajes/91/reaccion", """{"emoji":"👍"}"""),
                Triple("DELETE", "/v1/chat/conversaciones/7/mensajes/91/reaccion", null),
                Triple("POST", "/v1/chat/conversaciones/7/leido", """{"hasta":91}"""),
                Triple("DELETE", "/v1/chat/conversaciones/7/mensajes/91", null),
            ),
            llamadas,
        )
    }

    @Test
    fun buscarDirectasYGrupos() = runTest {
        respuestas["POST /v1/chat/conversaciones/directa"] = """{"id": 12}"""
        respuestas["POST /v1/chat/grupos"] = """{"id": 13}"""
        chat.buscar(7, "  ana maría ")
        assertEquals(12L, chat.directa("c2"))
        assertEquals(13L, chat.crearGrupo("Lectoras", listOf("c2", "c3")))
        chat.renombrar(13, "Lectores")
        chat.invitar(13, listOf("c4"))
        chat.cambiarRol(13, "c 4", "admin")
        chat.sacar(13, "c4")
        chat.salir(13)
        assertEquals(
            listOf(
                Triple("GET", "/v1/chat/conversaciones/7/buscar?q=ana%20mar%C3%ADa", null),
                Triple("POST", "/v1/chat/conversaciones/directa", """{"idCuenta":"c2"}"""),
                Triple("POST", "/v1/chat/grupos", """{"historial":"desde_ingreso","invitadas":["c2","c3"],"titulo":"Lectoras"}"""),
                Triple("PATCH", "/v1/chat/conversaciones/13", """{"titulo":"Lectores"}"""),
                Triple("POST", "/v1/chat/conversaciones/13/invitaciones", """{"cuentas":["c4"]}"""),
                Triple("PUT", "/v1/chat/conversaciones/13/participantes/c%204/rol", """{"rol":"admin"}"""),
                Triple("DELETE", "/v1/chat/conversaciones/13/participantes/c4", null),
                Triple("DELETE", "/v1/chat/conversaciones/13", null),
            ),
            llamadas,
        )
    }

    @Test
    fun elDetalleLasAmistadesYElTicket() = runTest {
        respuestas["GET /v1/chat/conversaciones/13"] = """{"id": 13, "tipo": "grupo", "titulo": "Lectoras", "miembros": 2, "rol": "admin",
            "participantes": [{"persona": {"id": "c1", "alias": "yo"}, "rol": "admin"}, {"persona": {"id": "c2", "alias": "eva"}}],
            "invitaciones": [{"id": 4, "persona": {"id": "c3", "alias": "leo"}}]}"""
        respuestas["GET /v1/social/amistades?limite=100"] = """{"vinculos": [{"persona": {"id": "c2", "alias": "eva"}}, {"persona": {"id": "c5", "alias": "x", "borrada": true}}, {}]}"""
        respuestas["POST /v1/tiempo-real/ticket"] = """{"ticket": "t1", "url": "wss://tr.example/ws"}"""
        val detalle = chat.detalle(13)
        assertEquals("admin", detalle.conversacion.rol)
        assertEquals(listOf("admin", "miembro"), detalle.participantes.map { it.rol })
        assertEquals("leo", detalle.invitaciones.single().persona?.alias)
        assertEquals(listOf("c2"), chat.amistades().map { it.id })
        assertEquals(TicketDeTiempoReal("t1", "wss://tr.example/ws"), chat.ticket())
    }

    @Test
    fun denunciarUnMensaje() = runTest {
        chat.denunciar(91, "acoso", "  ")
        chat.denunciar(91, "spam", " " + "a".repeat(600))
        assertEquals("""{"motivo":"acoso","referencia":"91","tipo":"mensaje"}""", llamadas[0].third)
        assertEquals(500, Regex("\"texto\":\"(a+)\"").find(llamadas[1].third!!)!!.groupValues[1].length)
    }
}
