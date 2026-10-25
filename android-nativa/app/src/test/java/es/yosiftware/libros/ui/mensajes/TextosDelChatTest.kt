package es.yosiftware.libros.ui.mensajes

import es.yosiftware.libros.datos.modelos.ConversacionDePlataforma
import es.yosiftware.libros.datos.modelos.MensajeDePlataforma
import java.time.Instant
import java.time.ZoneId
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Los textos del chat: los mismos casos que `platform-chat.spec.ts` y `chat-display.spec.ts` de la web. */
class TextosDelChatTest {
    private fun mensaje(json: String) = MensajeDePlataforma.de(JSONObject(json))
    private fun conversacion(json: String) = ConversacionDePlataforma.de(JSONObject(json))
    private fun aviso(codigo: String, datos: String) = mensaje(
        """{"id": 1, "tipo": "aviso", "aviso": {"codigo": "$codigo", "datos": $datos,
            "personas": {"yo": {"id": "yo", "alias": "yo", "nombre": "Yo"}, "c2": {"id": "c2", "alias": "eva", "nombre": "Eva"}, "c3": {"id": "c3", "alias": "leo"}}},
            "creado": "2026-10-25T10:00:00Z"}""",
    )

    @Test
    fun losAvisos() {
        assertEquals("Has creado el grupo «Lectoras»", TextosDelChat.textoDeAviso(aviso("grupo.creado", """{"cuenta": "yo", "titulo": "Lectoras"}"""), "yo"))
        assertEquals("Eva creó el grupo «Lectoras»", TextosDelChat.textoDeAviso(aviso("grupo.creado", """{"cuenta": "c2", "titulo": "Lectoras"}"""), "yo"))
        assertEquals("leo se ha unido", TextosDelChat.textoDeAviso(aviso("miembro.unido", """{"cuenta": "c3"}"""), "yo"))
        assertEquals("Eva te ha sacado", TextosDelChat.textoDeAviso(aviso("miembro.expulsado", """{"cuenta": "yo", "por": "c2"}"""), "yo"))
        assertEquals("Has sacado a Eva", TextosDelChat.textoDeAviso(aviso("miembro.expulsado", """{"cuenta": "c2", "por": "yo"}"""), "yo"))
        assertEquals("Eva ha sacado a leo", TextosDelChat.textoDeAviso(aviso("miembro.expulsado", """{"cuenta": "c3", "por": "c2"}"""), "yo"))
        assertEquals("Has activado la privacidad alta", TextosDelChat.textoDeAviso(aviso("privacidad.alta", """{"por": "yo", "activada": true}"""), "yo"))
        assertEquals("Eva ha activado los mensajes temporales: 7 días", TextosDelChat.textoDeAviso(aviso("temporal.cambiado", """{"por": "c2", "segundos": 604800}"""), "yo"))
        assertEquals("Has desactivado los mensajes temporales", TextosDelChat.textoDeAviso(aviso("temporal.cambiado", """{"por": "yo", "segundos": null}"""), "yo"))
        assertEquals("Alguien ha salido", TextosDelChat.textoDeAviso(aviso("miembro.salido", """{"cuenta": "c9"}"""), "yo"))
        assertEquals("", TextosDelChat.textoDeAviso(aviso("otro.codigo", "{}"), "yo"))
    }

    @Test
    fun losPlazos() {
        assertEquals("24 horas", TextosDelChat.plazo(86_400))
        assertEquals("7 días", TextosDelChat.plazo(604_800))
        assertEquals("90 días", TextosDelChat.plazo(7_776_000))
        assertEquals("2 horas", TextosDelChat.plazo(7_200))
    }

    @Test
    fun laVistaPreviaYElTitulo() {
        val directa = conversacion(
            """{"id": 7, "tipo": "directa", "persona": {"id": "c2", "alias": "eva", "nombre": " Eva "}, "miembros": 2,
            "ultimoMensaje": {"id": 9, "tipo": "texto", "persona": {"id": "yo", "alias": "yo"}, "texto": "Hola", "creado": "2026-10-25T10:00:00Z"},
            "permisos": {"escribir": true}}""",
        )
        val traducida = TextosDelChat.conversacion(directa, "yo")
        assertEquals("Eva", traducida.titulo)
        assertEquals("Tú: Hola", traducida.vistaPrevia)
        assertTrue(traducida.puedeEnviar)

        val grupo = conversacion(
            """{"id": 8, "tipo": "grupo", "miembros": 3, "permisos": {"escribir": true}, "cerrada": true,
            "ultimoMensaje": {"id": 10, "tipo": "texto", "persona": {"id": "c2", "alias": "eva", "nombre": "Eva"}, "borrado": true, "creado": "2026-10-25T11:00:00Z"}}""",
        )
        val grupoTraducido = TextosDelChat.conversacion(grupo, "yo")
        assertEquals("Eva: Mensaje borrado", grupoTraducido.vistaPrevia)
        assertFalse(grupoTraducido.puedeEnviar)
        assertEquals("Grupo", TextosDelChat.titulo(grupoTraducido))
        assertEquals("Empezad a chatear", TextosDelChat.vistaPrevia(conversacion("""{"id": 9, "tipo": "directa"}"""), "yo"))
        assertEquals("4 personas", TextosDelChat.vistaPrevia(conversacion("""{"id": 9, "tipo": "web", "miembros": 4}"""), "yo"))
        assertEquals("Chat de club", TextosDelChat.titulo(TextosDelChat.conversacion(conversacion("""{"id": 9, "tipo": "web"}"""), "yo")))
        assertEquals("Conversación", TextosDelChat.titulo(null))

        val borrada = TextosDelChat.conversacion(conversacion("""{"id": 9, "tipo": "directa", "persona": {"id": "c5", "alias": "x", "nombre": "X", "borrada": true}}"""), "yo")
        assertEquals("Cuenta borrada", borrada.titulo)
        assertNull(borrada.contraparte?.imagen)
    }

    @Test
    fun filtrarYOrdenar() {
        val lista = listOf(
            TextosDelChat.conversacion(conversacion("""{"id": 1, "tipo": "directa", "actividad": "2026-10-24T10:00:00Z"}"""), "yo"),
            TextosDelChat.conversacion(conversacion("""{"id": 2, "tipo": "web", "actividad": "2026-10-25T10:00:00+02:00"}"""), "yo"),
            TextosDelChat.conversacion(conversacion("""{"id": 3, "tipo": "grupo", "actividad": "2026-10-25T09:00:00Z"}"""), "yo"),
            TextosDelChat.conversacion(conversacion("""{"id": 4, "tipo": "grupo"}"""), "yo"),
        )
        assertEquals(listOf(3L, 2L, 1L, 4L), TextosDelChat.ordenar(lista).map { it.id })
        assertEquals(listOf(2L), lista.filter { TextosDelChat.cumple(it, FiltroDeChat.CLUB) }.map { it.id })
        assertEquals(listOf(3L, 4L), lista.filter { TextosDelChat.cumple(it, FiltroDeChat.GRUPO) }.map { it.id })
        assertEquals(4, lista.count { TextosDelChat.cumple(it, FiltroDeChat.TODAS) })
    }

    @Test
    fun lasReaccionesSinElSelectorDeVariacion() {
        val reacciones = TextosDelChat.reacciones(mapOf("❤" to 2, "❤️" to 1, "👍" to 1, "🔥" to 3, "😂" to 0), "❤")
        assertEquals(mapOf(TipoDeReaccion.ME_GUSTA to 3, TipoDeReaccion.APOYO to 1), reacciones.porTipo)
        assertEquals(TipoDeReaccion.ME_GUSTA, reacciones.mia)
        assertEquals(listOf("🔥" to 3), reacciones.otras)
        assertNull(reacciones.miEmoji)
        assertEquals("🔥", TextosDelChat.reacciones(emptyMap(), "🔥").miEmoji)
    }

    @Test
    fun losPermisosDeUnMensaje() {
        val ahora = Instant.parse("2026-10-25T10:10:00Z")
        val propio = mensaje("""{"id": 5, "tipo": "texto", "persona": {"id": "yo", "alias": "yo"}, "texto": "Hola", "creado": "2026-10-25T10:00:00Z"}""")
        val permisos = TextosDelChat.mensaje(propio, "yo", ahora = ahora).permisos
        assertEquals(PermisosDeMensaje(responder = true, reaccionar = true, editar = true, borrar = true, denunciar = false), permisos)
        assertFalse(TextosDelChat.mensaje(propio, "yo", ahora = Instant.parse("2026-10-25T10:15:00Z")).permisos.editar)
        assertFalse(TextosDelChat.mensaje(propio, "yo", puedeEscribir = false, ahora = ahora).permisos.responder)
        assertTrue(TextosDelChat.mensaje(propio, "yo", puedeEscribir = false, ahora = ahora).permisos.borrar)

        val ajeno = TextosDelChat.mensaje(
            mensaje("""{"id": 6, "tipo": "texto", "persona": {"id": "c2", "alias": "eva"}, "texto": "Hola", "creado": "2026-10-25T10:00:00Z"}"""),
            "yo",
            ahora = ahora,
        )
        assertFalse(ajeno.propio)
        assertTrue(ajeno.permisos.denunciar)
        assertFalse(ajeno.permisos.borrar)

        val retirado = TextosDelChat.mensaje(
            mensaje("""{"id": 7, "tipo": "texto", "persona": {"id": "c2", "alias": "eva"}, "retirado": true, "creado": "2026-10-25T10:00:00Z"}"""),
            "yo",
            ahora = ahora,
        )
        assertTrue(retirado.eliminado)
        assertEquals(PermisosDeMensaje.NINGUNO, retirado.permisos)

        val avisoTraducido = TextosDelChat.mensaje(aviso("miembro.unido", """{"cuenta": "c2"}"""), "yo", ahora = ahora)
        assertTrue(avisoTraducido.sistema)
        assertEquals("Eva se ha unido", avisoTraducido.texto)
        assertEquals(PermisosDeMensaje.NINGUNO, avisoTraducido.permisos)
    }

    @Test
    fun laCitaYLaCabecera() {
        val respuesta = TextosDelChat.mensaje(
            mensaje(
                """{"id": 8, "tipo": "texto", "persona": {"id": "c2", "alias": "eva", "nombre": "Eva"}, "texto": "Sí", "susurro": true,
                "respuesta": {"id": 5, "persona": {"id": "yo"}, "borrado": true}, "creado": "2026-10-25T10:00:00Z"}""",
            ),
            "yo",
        )
        assertEquals("Mensaje respondido eliminado", TextosDelChat.textoDeCita(respuesta.respondido!!))
        assertEquals("Eva · 25/10/2026 11:00 · Susurro", TextosDelChat.cabecera(respuesta, ZoneId.of("Europe/Madrid")))
        val temporal = respuesta.copy(id = -1, susurro = false, envio = EstadoDeEnvio.FALLIDO)
        assertEquals("Tú · 25/10/2026 11:00 · Falló el envío", TextosDelChat.cabecera(temporal, ZoneId.of("Europe/Madrid")))
    }
}
