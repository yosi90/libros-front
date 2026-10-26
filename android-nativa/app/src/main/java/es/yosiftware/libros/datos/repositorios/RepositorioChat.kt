package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.modelos.ConversacionDePlataforma
import es.yosiftware.libros.datos.modelos.DetalleDeConversacion
import es.yosiftware.libros.datos.modelos.MensajeDePlataforma
import es.yosiftware.libros.datos.modelos.PaginaConCursor
import es.yosiftware.libros.datos.modelos.PersonaDeYosiftware
import es.yosiftware.libros.datos.red.codificarComponente
import org.json.JSONArray
import org.json.JSONObject

/** El ticket de un solo uso para abrir el socket del tiempo real (`POST /v1/tiempo-real/ticket`). */
data class TicketDeTiempoReal(val ticket: String, val url: String)

/** Un motivo de denuncia de la moderación de la plataforma. */
data class MotivoDeDenuncia(val clave: String, val nombre: String)

/**
 * El chat de la plataforma (`platform-chat.service.ts` de la web; docs/publica/ENDPOINTS.md, «Chat»), con la interfaz
 * de Libros: la bandeja, el detalle, los mensajes, enviar, editar, borrar, reaccionar, leído, buscar, directas y
 * grupos, las amistades para invitar, el ticket del tiempo real y la denuncia de un mensaje.
 */
class RepositorioChat(private val plataforma: LlamadaDePlataforma) {
    suspend fun conversaciones(): List<ConversacionDePlataforma> = plataforma.objeto("GET", "/v1/chat/conversaciones").lista("conversaciones", ConversacionDePlataforma::de)

    suspend fun detalle(id: Long): DetalleDeConversacion = DetalleDeConversacion.de(plataforma.objeto("GET", "/v1/chat/conversaciones/$id"))

    /** Una página de mensajes, en orden; [antes] es el cursor de la anterior. */
    suspend fun mensajes(id: Long, antes: String? = null): PaginaConCursor<MensajeDePlataforma> {
        val json = plataforma.objeto("GET", "/v1/chat/conversaciones/$id/mensajes?limite=50" + (antes?.let { "&antes=" + codificarComponente(it) } ?: ""))
        return PaginaConCursor(json.lista("mensajes", MensajeDePlataforma::de), json.texto("cursor"))
    }

    /** Envía un mensaje; repetir el mismo [idCliente] devuelve el ya enviado (no lo duplica). */
    suspend fun enviar(id: Long, texto: String, idCliente: String, respuestaA: Long? = null): MensajeDePlataforma {
        val cuerpo = JSONObject().put("texto", texto).put("idCliente", idCliente)
        if (respuestaA != null) cuerpo.put("idRespuesta", respuestaA)
        return MensajeDePlataforma.de(plataforma.objeto("POST", "/v1/chat/conversaciones/$id/mensajes", cuerpo))
    }

    suspend fun editar(id: Long, mensaje: Long, texto: String): MensajeDePlataforma =
        MensajeDePlataforma.de(plataforma.objeto("PATCH", "/v1/chat/conversaciones/$id/mensajes/$mensaje", JSONObject().put("texto", texto)))

    suspend fun borrar(id: Long, mensaje: Long) {
        plataforma.objeto("DELETE", "/v1/chat/conversaciones/$id/mensajes/$mensaje")
    }

    /** Pone la reacción [emoji], o la quita con `null`. */
    suspend fun reaccionar(id: Long, mensaje: Long, emoji: String?) {
        if (emoji == null) plataforma.objeto("DELETE", "/v1/chat/conversaciones/$id/mensajes/$mensaje/reaccion")
        else plataforma.objeto("PUT", "/v1/chat/conversaciones/$id/mensajes/$mensaje/reaccion", JSONObject().put("emoji", emoji))
    }

    suspend fun leido(id: Long, hasta: Long) {
        plataforma.objeto("POST", "/v1/chat/conversaciones/$id/leido", JSONObject().put("hasta", hasta))
    }

    /** Hasta 20 mensajes que contienen [texto] (de 2 a 100 caracteres), los más nuevos primero. */
    suspend fun buscar(id: Long, texto: String): List<MensajeDePlataforma> =
        plataforma.objeto("GET", "/v1/chat/conversaciones/$id/buscar?q=" + codificarComponente(texto.trim())).lista("mensajes", MensajeDePlataforma::de)

    /** La directa con [cuenta] (la crea si no existe); devuelve su id. */
    suspend fun directa(cuenta: String): Long = plataforma.objeto("POST", "/v1/chat/conversaciones/directa", JSONObject().put("idCuenta", cuenta)).optLong("id")

    /** Un grupo privado con [invitadas] (amistades); devuelve su id. */
    suspend fun crearGrupo(titulo: String, invitadas: List<String>): Long = plataforma.objeto(
        "POST", "/v1/chat/grupos",
        JSONObject().put("titulo", titulo).put("invitadas", JSONArray(invitadas)).put("historial", "desde_ingreso"),
    ).optLong("id")

    suspend fun renombrar(id: Long, titulo: String) {
        plataforma.objeto("PATCH", "/v1/chat/conversaciones/$id", JSONObject().put("titulo", titulo))
    }

    /** Salir de un grupo. */
    suspend fun salir(id: Long) {
        plataforma.objeto("DELETE", "/v1/chat/conversaciones/$id")
    }

    suspend fun invitar(id: Long, cuentas: List<String>) {
        plataforma.objeto("POST", "/v1/chat/conversaciones/$id/invitaciones", JSONObject().put("cuentas", JSONArray(cuentas)))
    }

    suspend fun sacar(id: Long, cuenta: String) {
        plataforma.objeto("DELETE", "/v1/chat/conversaciones/$id/participantes/" + codificarComponente(cuenta))
    }

    suspend fun cambiarRol(id: Long, cuenta: String, rol: String) {
        plataforma.objeto("PUT", "/v1/chat/conversaciones/$id/participantes/" + codificarComponente(cuenta) + "/rol", JSONObject().put("rol", rol))
    }

    /** Las amistades (las 100 primeras), sin las cuentas borradas. */
    suspend fun amistades(): List<PersonaDeYosiftware> = plataforma.objeto("GET", "/v1/social/amistades?limite=100")
        .lista("vinculos") { it.objeto("persona")?.let(PersonaDeYosiftware::de) ?: PersonaDeYosiftware("", "", null, null, true) }
        .filterNot { it.borrada || it.id.isEmpty() }

    suspend fun ticket(): TicketDeTiempoReal {
        val json = plataforma.objeto("POST", "/v1/tiempo-real/ticket", JSONObject())
        return TicketDeTiempoReal(json.texto("ticket").orEmpty(), json.texto("url").orEmpty())
    }

    suspend fun motivosDeDenuncia(): List<MotivoDeDenuncia> = plataforma.objeto("GET", "/v1/moderacion/motivos")
        .lista("motivos") { MotivoDeDenuncia(it.texto("clave") ?: it.texto("id").orEmpty(), it.texto("nombre") ?: it.texto("texto").orEmpty()) }

    suspend fun denunciar(mensaje: Long, motivo: String, texto: String?) {
        val cuerpo = JSONObject().put("tipo", "mensaje").put("referencia", mensaje.toString()).put("motivo", motivo)
        texto?.trim()?.takeIf { it.isNotEmpty() }?.let { cuerpo.put("texto", it.take(500)) }
        plataforma.objeto("POST", "/v1/moderacion/denuncias", cuerpo)
    }
}
