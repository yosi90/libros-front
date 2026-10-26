package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.largo
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.objetos
import es.yosiftware.libros.datos.json.texto
import org.json.JSONArray
import org.json.JSONObject

// El chat de la plataforma tal como lo cuenta su contrato (administracion yosiftware: docs/publica/ENDPOINTS.md, «Chat»;
// `interfaces/platform-chat.ts` de la web). Los ids de las conversaciones y los mensajes son números; los de las
// cuentas, texto. Lo que se pinta lo traduce `ui/mensajes/TextosDelChat.kt`.

/** Lo que la persona puede hacer en una conversación. */
data class PermisosDeConversacion(val escribir: Boolean, val invitar: Boolean, val administrar: Boolean, val salir: Boolean) {
    companion object {
        val NINGUNO = PermisosDeConversacion(false, false, false, false)

        fun de(json: JSONObject?) = if (json == null) NINGUNO else PermisosDeConversacion(
            escribir = json.booleano("escribir") ?: false,
            invitar = json.booleano("invitar") ?: false,
            administrar = json.booleano("administrar") ?: false,
            salir = json.booleano("salir") ?: false,
        )
    }
}

/** Un aviso del chat («Ana se ha unido»): su código, sus datos y los nombres de las personas que nombra. */
data class AvisoDeChat(val codigo: String, val datos: JSONObject, val personas: Map<String, PersonaDeYosiftware>) {
    companion object {
        fun de(json: JSONObject): AvisoDeChat {
            // `personas` llega como mapa por id o como lista.
            val personas = when (val valor = json.opt("personas")) {
                is JSONObject -> valor.keys().asSequence().mapNotNull { id -> valor.optJSONObject(id)?.let { id to PersonaDeYosiftware.de(it) } }.toMap()
                is JSONArray -> valor.objetos().map(PersonaDeYosiftware::de).associateBy { it.id }
                else -> emptyMap()
            }
            return AvisoDeChat(json.texto("codigo").orEmpty(), json.objeto("datos") ?: JSONObject(), personas)
        }
    }
}

/** El mensaje al que responde otro. */
data class RespuestaDeChat(val id: Long, val personaId: String?, val texto: String?, val borrado: Boolean, val noDisponible: Boolean) {
    companion object {
        fun de(json: JSONObject) = RespuestaDeChat(
            id = json.largo("id") ?: 0,
            personaId = json.objeto("persona")?.texto("id"),
            texto = json.texto("texto"),
            borrado = json.booleano("borrado") ?: false,
            noDisponible = json.booleano("noDisponible") ?: false,
        )
    }
}

/** Un mensaje del chat (`PlataformaMensaje`). En los eventos no llegan `propio`, `idCliente` ni la reacción propia. */
data class MensajeDePlataforma(
    val id: Long,
    val conversacion: Long,
    /** `texto` o `aviso`. */
    val tipo: String,
    val persona: PersonaDeYosiftware?,
    val texto: String?,
    val aviso: AvisoDeChat?,
    val respuesta: RespuestaDeChat?,
    /** Cuántas personas han reaccionado con cada emoji. */
    val reacciones: Map<String, Int>,
    val reaccionMia: String?,
    val editado: String?,
    val borrado: Boolean,
    val retirado: Boolean,
    val noDisponible: Boolean,
    val propio: Boolean?,
    val idCliente: String?,
    val creado: String,
    val susurro: Boolean,
) {
    companion object {
        fun de(json: JSONObject): MensajeDePlataforma {
            val reacciones = json.objeto("reacciones")
            val total = reacciones?.objeto("total")
            return MensajeDePlataforma(
                id = json.largo("id") ?: 0,
                conversacion = json.largo("conversacion") ?: 0,
                tipo = json.texto("tipo") ?: "texto",
                persona = json.objeto("persona")?.let(PersonaDeYosiftware::de),
                texto = json.texto("texto"),
                aviso = json.objeto("aviso")?.let(AvisoDeChat::de),
                respuesta = json.objeto("respuesta")?.let(RespuestaDeChat::de),
                reacciones = total?.keys()?.asSequence()?.associateWith { total.optInt(it) }.orEmpty(),
                reaccionMia = reacciones?.texto("mia"),
                editado = json.texto("editado"),
                borrado = json.booleano("borrado") ?: false,
                retirado = json.booleano("retirado") ?: false,
                noDisponible = json.booleano("noDisponible") ?: false,
                propio = json.booleano("propio"),
                idCliente = json.texto("idCliente"),
                creado = json.texto("creado").orEmpty(),
                susurro = json.booleano("susurro") ?: false,
            )
        }
    }
}

/** Una conversación de la bandeja (`PlataformaConversacion`). */
data class ConversacionDePlataforma(
    val id: Long,
    /** `directa`, `grupo` o `web` (la de un club). */
    val tipo: String,
    val titulo: String?,
    /** En una directa, la otra persona. */
    val persona: PersonaDeYosiftware?,
    val web: Referencia?,
    val miembros: Int,
    /** `miembro` o `admin`. */
    val rol: String,
    val noLeidos: Int,
    val ultimoMensaje: MensajeDePlataforma?,
    val actividad: String?,
    val cerrada: Boolean,
    val permisos: PermisosDeConversacion,
) {
    companion object {
        fun de(json: JSONObject) = ConversacionDePlataforma(
            id = json.largo("id") ?: 0,
            tipo = json.texto("tipo") ?: "directa",
            titulo = json.texto("titulo"),
            persona = json.objeto("persona")?.let(PersonaDeYosiftware::de),
            web = json.objeto("web")?.let { Referencia(0, it.texto("nombre") ?: it.texto("clave").orEmpty()) },
            miembros = json.entero("miembros") ?: 0,
            rol = json.texto("rol") ?: "miembro",
            noLeidos = (json.entero("noLeidos") ?: 0).coerceAtLeast(0),
            ultimoMensaje = json.objeto("ultimoMensaje")?.let(MensajeDePlataforma::de),
            actividad = json.texto("actividad"),
            cerrada = json.booleano("cerrada") ?: false,
            permisos = PermisosDeConversacion.de(json.objeto("permisos")),
        )
    }
}

/** Un participante de una conversación. */
data class ParticipanteDeChat(val persona: PersonaDeYosiftware, val rol: String)

/** Una invitación pendiente a un grupo (solo a quien lo administra). */
data class InvitacionDeChat(val id: Long, val persona: PersonaDeYosiftware?)

/** El detalle de una conversación: la conversación, sus participantes y sus invitaciones. */
data class DetalleDeConversacion(val conversacion: ConversacionDePlataforma, val participantes: List<ParticipanteDeChat>, val invitaciones: List<InvitacionDeChat>) {
    companion object {
        fun de(json: JSONObject): DetalleDeConversacion {
            return DetalleDeConversacion(
                conversacion = ConversacionDePlataforma.de(json),
                participantes = json.lista("participantes") { p ->
                    p.objeto("persona")?.let { ParticipanteDeChat(PersonaDeYosiftware.de(it), p.texto("rol") ?: "miembro") }
                }.filterNotNull(),
                invitaciones = json.lista("invitaciones") { InvitacionDeChat(it.largo("id") ?: 0, it.objeto("persona")?.let(PersonaDeYosiftware::de)) },
            )
        }
    }
}
