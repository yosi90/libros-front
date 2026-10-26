package es.yosiftware.libros.ui.mensajes

import androidx.annotation.DrawableRes
import es.yosiftware.libros.datos.leerFecha
import es.yosiftware.libros.datos.modelos.ConversacionDePlataforma
import es.yosiftware.libros.datos.modelos.DetalleDeConversacion
import es.yosiftware.libros.datos.modelos.MensajeDePlataforma
import es.yosiftware.libros.datos.modelos.PersonaDeYosiftware
import es.yosiftware.libros.ui.comunidad.FechasDeClubes
import es.yosiftware.libros.ui.tema.Iconos
import java.time.Instant
import java.time.ZoneId

// Traduce el contrato del chat de la plataforma a lo que pinta Libros (`shared/platform-chat.ts` y
// `shared/chat-display.ts` de la web). Los textos de los avisos y de la vista previa siguen a los del SDK, para que la
// misma conversación se lea igual aquí que en la web social.

/** Las cinco reacciones de Libros y su emoji en la plataforma. */
enum class TipoDeReaccion(val emoji: String, val etiqueta: String) {
    ME_GUSTA("❤️", "Me gusta"),
    RISA("😂", "Risa"),
    SORPRESA("😮", "Sorpresa"),
    TRISTE("😢", "Triste"),
    APOYO("👍", "Apoyo"),
    ;

    companion object {
        fun de(emoji: String?): TipoDeReaccion? = entries.firstOrNull { mismoEmoji(it.emoji, emoji) }
    }
}

/** La plataforma guarda cada emoji sin el selector de variación (U+FE0F): se comparan sin él. */
fun mismoEmoji(a: String?, b: String?): Boolean = a != null && b != null && a.replace("️", "") == b.replace("️", "")

/** Una persona tal como la pinta el chat; [imagen] es la ruta de su miniatura en la plataforma. */
data class PersonaDelChat(val id: String, val alias: String, val nombre: String, val imagen: String?, val borrada: Boolean)

/** Una conversación de la bandeja, ya traducida (`ChatConversation`). */
data class ConversacionDelChat(
    val id: Long,
    val tipo: String,
    val titulo: String?,
    val fechaUltimoMensaje: String?,
    val noLeidos: Int,
    val puedeEnviar: Boolean,
    val cerrada: Boolean,
    val miembros: Int,
    val contraparte: PersonaDelChat?,
    val vistaPrevia: String?,
    val actividad: String?,
)

/** Las reacciones de un mensaje: las cinco de Libros por su tipo y las demás tal cual. */
data class ReaccionesDelChat(
    val porTipo: Map<TipoDeReaccion, Int> = emptyMap(),
    val mia: TipoDeReaccion? = null,
    val otras: List<Pair<String, Int>> = emptyList(),
    val miEmoji: String? = null,
)

data class PermisosDeMensaje(val responder: Boolean, val reaccionar: Boolean, val editar: Boolean, val borrar: Boolean, val denunciar: Boolean) {
    companion object {
        val NINGUNO = PermisosDeMensaje(false, false, false, false, false)
    }
}

data class RespondidoDelChat(val id: Long, val remitenteId: String?, val texto: String, val eliminado: Boolean)

/** Cómo va un mensaje enviado desde esta pantalla. */
enum class EstadoDeEnvio(val texto: String) { ENVIANDO("Enviando…"), ENVIADO("Enviado"), FALLIDO("Falló el envío") }

/** Un mensaje ya traducido (`ChatMessage`). Los temporales tienen id negativo. */
data class MensajeDelChat(
    val id: Long,
    val sistema: Boolean,
    val remitenteId: String?,
    val remitente: PersonaDelChat?,
    val propio: Boolean,
    val texto: String,
    val fecha: String,
    val editado: String?,
    val eliminado: Boolean,
    val noDisponible: Boolean,
    val susurro: Boolean,
    val idCliente: String?,
    val reacciones: ReaccionesDelChat,
    val permisos: PermisosDeMensaje,
    val respondido: RespondidoDelChat?,
    val envio: EstadoDeEnvio? = null,
)

/** Un participante del detalle: la persona y si administra. */
data class ParticipanteDelChat(val persona: PersonaDelChat, val admin: Boolean)

/** El detalle de una conversación ya traducido (`ChatConversationDetail`): siempre trae título. */
data class DetalleDelChat(
    val id: Long,
    val tipo: String,
    val titulo: String,
    /** El título que puso el grupo (para renombrarlo); `null` si no tiene. */
    val tituloPropio: String?,
    val contraparte: PersonaDelChat?,
    val puedeEnviar: Boolean,
    /** Solo en grupos y si se administra (`PuedeGestionarParticipantes`). */
    val puedeGestionar: Boolean,
    val cerrada: Boolean,
    val participantes: List<ParticipanteDelChat>,
)

/** El filtro de la bandeja: `club` son las conversaciones de los clubes (tipo `web` en la plataforma). */
enum class FiltroDeChat(val etiqueta: String) { TODAS("Todas"), DIRECTA("Directos"), CLUB("Clubes"), GRUPO("Grupos") }

object TextosDelChat {
    /** Minutos que la plataforma deja editar un mensaje propio. */
    const val VENTANA_DE_EDICION_MS = 15 * 60_000L
    private const val BORRADA = "Cuenta borrada"
    private const val NO_DISPONIBLE = "Mensaje no disponible"

    fun persona(persona: PersonaDeYosiftware?): PersonaDelChat? {
        if (persona == null || persona.id.isEmpty()) return null
        val nombre = if (persona.borrada) BORRADA else persona.nombre?.trim()?.takeIf { it.isNotEmpty() } ?: persona.alias.trim().ifEmpty { "Alguien" }
        return PersonaDelChat(persona.id, persona.alias, nombre, if (persona.borrada) null else persona.avatar, persona.borrada)
    }

    private fun nombre(persona: PersonaDeYosiftware?): String = persona(persona)?.nombre ?: "Alguien"

    /** Cuánto duran los mensajes temporales: «24 horas», «7 días» o «90 días». */
    fun plazo(segundos: Long): String = if (segundos % 86_400 == 0L && segundos > 86_400) "${segundos / 86_400} días" else "${Math.round(segundos / 3600.0)} horas"

    /** El texto de un aviso del chat («Ana se ha unido»), como lo escribe el SDK. */
    fun textoDeAviso(mensaje: MensajeDePlataforma, yo: String?): String {
        val aviso = mensaje.aviso ?: return ""
        val datos = aviso.datos
        val cuenta = datos.optString("cuenta").takeIf { datos.opt("cuenta") is String }
        val por = datos.optString("por").takeIf { datos.opt("por") is String }
        val titulo = if (datos.opt("titulo") is String) datos.optString("titulo") else ""
        val quien = cuenta?.let { nombre(aviso.personas[it]) } ?: "Alguien"
        val quienPor = por?.let { nombre(aviso.personas[it]) } ?: "Alguien"
        val soyYo = cuenta != null && cuenta == yo
        return when (aviso.codigo) {
            "grupo.creado" -> if (soyYo) "Has creado el grupo «$titulo»" else "$quien creó el grupo «$titulo»"
            "grupo.titulo" -> if (soyYo) "Has cambiado el título a «$titulo»" else "$quien cambió el título a «$titulo»"
            "miembro.unido" -> if (soyYo) "Te has unido" else "$quien se ha unido"
            "miembro.salido" -> if (soyYo) "Has salido" else "$quien ha salido"
            "miembro.expulsado" -> when {
                soyYo -> "$quienPor te ha sacado"
                por == yo -> "Has sacado a $quien"
                else -> "$quienPor ha sacado a $quien"
            }
            "admin.nombrado" -> if (soyYo) "Ahora administras el grupo" else "$quien ahora administra el grupo"
            "privacidad.alta" -> {
                val verbo = if (datos.opt("activada") == true) "activado" else "desactivado"
                if (por == yo) "Has $verbo la privacidad alta" else "$quienPor ha $verbo la privacidad alta"
            }
            "temporal.cambiado" -> {
                val segundos = (datos.opt("segundos") as? Number)?.toLong()?.takeIf { it > 0 }
                val que = segundos?.let { "activado los mensajes temporales: ${plazo(it)}" } ?: "desactivado los mensajes temporales"
                if (por == yo) "Has $que" else "$quienPor ha $que"
            }
            else -> ""
        }
    }

    private fun textoDeMensaje(mensaje: MensajeDePlataforma): String = when {
        mensaje.noDisponible -> NO_DISPONIBLE
        mensaje.borrado || mensaje.retirado -> "Mensaje borrado"
        else -> mensaje.texto.orEmpty()
    }

    private fun esPropio(mensaje: MensajeDePlataforma, yo: String?): Boolean = mensaje.propio ?: (yo != null && mensaje.persona?.id == yo)

    /** La línea de la bandeja bajo el título: el último mensaje, como en el SDK. */
    fun vistaPrevia(conversacion: ConversacionDePlataforma, yo: String?): String {
        val mensaje = conversacion.ultimoMensaje ?: return if (conversacion.tipo == "directa") "Empezad a chatear" else "${conversacion.miembros} personas"
        if (mensaje.tipo == "aviso") return textoDeAviso(mensaje, yo)
        val texto = textoDeMensaje(mensaje)
        return when {
            esPropio(mensaje, yo) -> "Tú: $texto"
            conversacion.tipo != "directa" && mensaje.persona != null -> "${nombre(mensaje.persona)}: $texto"
            else -> texto
        }
    }

    fun conversacion(conversacion: ConversacionDePlataforma, yo: String?): ConversacionDelChat {
        val titulo = conversacion.titulo?.trim()?.takeIf { it.isNotEmpty() }
            ?: if (conversacion.tipo == "directa") persona(conversacion.persona)?.nombre else null
        return ConversacionDelChat(
            id = conversacion.id,
            tipo = conversacion.tipo,
            titulo = titulo,
            fechaUltimoMensaje = conversacion.ultimoMensaje?.creado ?: conversacion.actividad,
            noLeidos = conversacion.noLeidos,
            puedeEnviar = conversacion.permisos.escribir && !conversacion.cerrada,
            cerrada = conversacion.cerrada,
            miembros = conversacion.miembros,
            contraparte = persona(conversacion.persona),
            vistaPrevia = vistaPrevia(conversacion, yo),
            actividad = conversacion.actividad,
        )
    }

    /** El título de una conversación en la bandeja (`chatConversationTitle`). */
    fun titulo(conversacion: ConversacionDelChat?): String = when {
        conversacion == null -> "Conversación"
        !conversacion.titulo.isNullOrBlank() -> conversacion.titulo.trim()
        conversacion.tipo == "web" -> "Chat de club"
        conversacion.tipo == "grupo" -> "Grupo"
        !conversacion.contraparte?.nombre.isNullOrBlank() -> conversacion.contraparte!!.nombre
        else -> "Conversación directa"
    }

    fun detalle(detalle: DetalleDeConversacion, yo: String?): DetalleDelChat {
        val conversacion = conversacion(detalle.conversacion, yo)
        return DetalleDelChat(
            id = conversacion.id,
            tipo = conversacion.tipo,
            titulo = tituloDelDetalle(conversacion),
            tituloPropio = detalle.conversacion.titulo?.trim()?.takeIf { it.isNotEmpty() },
            contraparte = conversacion.contraparte,
            puedeEnviar = conversacion.puedeEnviar,
            puedeGestionar = detalle.conversacion.tipo == "grupo" && detalle.conversacion.permisos.administrar,
            cerrada = conversacion.cerrada,
            participantes = detalle.participantes.mapNotNull { p -> persona(p.persona)?.let { ParticipanteDelChat(it, p.rol == "admin") } },
        )
    }

    /** El título del detalle: siempre lo hay (`toChatConversationDetail`). */
    fun tituloDelDetalle(conversacion: ConversacionDelChat): String = conversacion.titulo ?: when (conversacion.tipo) {
        "web" -> "Chat de club"
        "grupo" -> "Grupo"
        else -> "Conversación directa"
    }

    /** El icono de la fila (`chatConversationIcon`): `groups` el club, `group` el grupo y `person` la directa. */
    @DrawableRes
    fun icono(conversacion: ConversacionDelChat): Int = when (conversacion.tipo) {
        "web" -> Iconos.groups
        "grupo" -> Iconos.group
        else -> Iconos.person
    }

    fun cumple(conversacion: ConversacionDelChat, filtro: FiltroDeChat): Boolean = when (filtro) {
        FiltroDeChat.TODAS -> true
        FiltroDeChat.CLUB -> conversacion.tipo == "web"
        FiltroDeChat.DIRECTA -> conversacion.tipo == "directa"
        FiltroDeChat.GRUPO -> conversacion.tipo == "grupo"
    }

    /** La más activa primero; a igualdad, la de id mayor. */
    fun ordenar(conversaciones: List<ConversacionDelChat>): List<ConversacionDelChat> =
        conversaciones.sortedWith(compareByDescending<ConversacionDelChat> { instante(it.fechaUltimoMensaje ?: it.actividad) ?: Long.MIN_VALUE }.thenByDescending { it.id })

    fun reacciones(total: Map<String, Int>, mia: String?): ReaccionesDelChat {
        val porTipo = mutableMapOf<TipoDeReaccion, Int>()
        val otras = mutableListOf<Pair<String, Int>>()
        total.forEach { (emoji, cuantas) ->
            if (cuantas < 1) return@forEach
            val tipo = TipoDeReaccion.de(emoji)
            if (tipo != null) porTipo[tipo] = (porTipo[tipo] ?: 0) + cuantas else otras += emoji to cuantas
        }
        val miTipo = TipoDeReaccion.de(mia)
        return ReaccionesDelChat(porTipo, miTipo, otras, mia.takeIf { miTipo == null && !it.isNullOrEmpty() })
    }

    /**
     * Un mensaje en el modelo de Libros. [puedeEscribir] dice si la conversación deja responder y reaccionar; editar y
     * borrar solo valen en los propios, y editar, en los 15 minutos siguientes ([ahora]).
     */
    fun mensaje(mensaje: MensajeDePlataforma, yo: String?, puedeEscribir: Boolean = true, ahora: Instant = Instant.now()): MensajeDelChat {
        val aviso = mensaje.tipo == "aviso"
        val propio = !aviso && esPropio(mensaje, yo)
        val eliminado = mensaje.borrado || mensaje.retirado
        val usable = !aviso && !eliminado && !mensaje.noDisponible
        val respuesta = mensaje.respuesta
        return MensajeDelChat(
            id = mensaje.id,
            sistema = aviso,
            remitenteId = if (aviso) null else mensaje.persona?.id,
            remitente = if (aviso) null else persona(mensaje.persona),
            propio = propio,
            texto = when {
                aviso -> textoDeAviso(mensaje, yo)
                mensaje.noDisponible -> NO_DISPONIBLE
                else -> mensaje.texto.orEmpty()
            },
            fecha = mensaje.creado,
            editado = mensaje.editado,
            eliminado = eliminado,
            noDisponible = mensaje.noDisponible,
            susurro = mensaje.susurro,
            idCliente = mensaje.idCliente,
            reacciones = reacciones(mensaje.reacciones, mensaje.reaccionMia),
            permisos = PermisosDeMensaje(
                responder = usable && puedeEscribir,
                reaccionar = usable && puedeEscribir,
                editar = usable && propio && puedeEscribir && editable(mensaje.creado, ahora),
                borrar = !aviso && !eliminado && propio,
                denunciar = usable && !propio,
            ),
            respondido = respuesta?.let {
                RespondidoDelChat(it.id, it.personaId, if (it.noDisponible) NO_DISPONIBLE else it.texto.orEmpty(), it.borrado)
            },
        )
    }

    /** Si aún se puede editar: en Kotlin se recalcula con el reloj (en la web se quedaba fijo al recibirlo). */
    fun editable(creado: String, ahora: Instant = Instant.now()): Boolean =
        instante(creado)?.let { ahora.toEpochMilli() - it < VENTANA_DE_EDICION_MS } ?: false

    /** El texto de la cita de una respuesta. */
    fun textoDeCita(respondido: RespondidoDelChat): String = if (respondido.eliminado) "Mensaje respondido eliminado" else respondido.texto

    /** «Ana · 25/10/2026 11:00», con «Yosiftware» en los avisos y «Tú» en el temporal propio. */
    fun cabecera(mensaje: MensajeDelChat, zona: ZoneId = ZoneId.systemDefault()): String {
        val quien = when {
            mensaje.sistema -> "Yosiftware"
            mensaje.id < 0 -> "Tú"
            else -> mensaje.remitente?.nombre ?: "Usuario"
        }
        val partes = mutableListOf("$quien · ${FechasDeClubes.completa(mensaje.fecha, zona)}")
        if (mensaje.susurro) partes += "Susurro"
        mensaje.envio?.let { partes += it.texto }
        return partes.joinToString(" · ")
    }

    private fun instante(iso: String?): Long? = leerFecha(iso, ZoneId.of("UTC"))?.toInstant()?.toEpochMilli()
}
