package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.decimal
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

// El contenido propio de los clubes de lectura (`/clubes-lectura`), que se queda en Libros. La pertenencia (entrar,
// salir, invitar, las solicitudes y las bandejas) pasa a los espacios de la plataforma (datos/modelos/Espacios.kt,
// decisión 5 del roadmap) y su conversación al chat de la plataforma (decisión 6). Cada club tiene su espacio
// (`EspacioId`, con `idExterno` `club-<Id>`).

/** Lo que lee un club: un libro, una saga, un universo o una antología (`ClubTarget`). */
data class ObjetivoDeClub(val tipo: String, val id: Int?) {
    companion object {
        fun de(json: JSONObject) = ObjetivoDeClub(json.texto("Tipo").orEmpty(), json.entero("Id"))
    }
}

/**
 * Un club en una lista: `ClubSummary` y sus variantes, que añaden lo que corresponde a cada lista (el rol en «Mis
 * clubes», el estado de la pertenencia en el descubrimiento y la actividad en los clubes públicos activos).
 */
data class ResumenDeClub(
    val id: Int,
    val nombre: String,
    val descripcionMarkdown: String?,
    /** `abierto` o `cerrado`. */
    val visibilidad: String,
    val propietarioId: Int,
    val objetivo: ObjetivoDeClub?,
    val miembros: Int,
    val fechaActualizacion: String?,
    /** En «Mis clubes»: `propietario`, `moderador` o `miembro`. */
    val rol: String? = null,
    val fechaIncorporacion: String? = null,
    val retiradoDescubrimiento: Boolean? = null,
    /** En el descubrimiento: `disponible`, `miembro` o `solicitud_pendiente`. */
    val estadoMembresia: String? = null,
    val actividad30Dias: ActividadDeClub? = null,
    val ultimaActividad: String? = null,
    /** El espacio del club en la plataforma; `null` solo en un club anterior a los espacios. */
    val espacioId: Long? = null,
) {
    companion object {
        fun de(json: JSONObject) = ResumenDeClub(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            descripcionMarkdown = json.texto("DescripcionMarkdown"),
            visibilidad = json.texto("Visibilidad").orEmpty(),
            propietarioId = json.entero("PropietarioId") ?: 0,
            objetivo = json.objeto("Objetivo")?.let(ObjetivoDeClub::de),
            miembros = json.entero("Miembros") ?: 0,
            fechaActualizacion = json.texto("FechaActualizacion"),
            rol = json.texto("Rol"),
            fechaIncorporacion = json.texto("FechaIncorporacion"),
            retiradoDescubrimiento = json.booleano("RetiradoDescubrimiento"),
            estadoMembresia = json.texto("EstadoMembresia"),
            actividad30Dias = json.objeto("Actividad30Dias")?.let(ActividadDeClub::de),
            ultimaActividad = json.texto("UltimaActividad"),
            espacioId = json.entero("EspacioId")?.toLong(),
        )
    }
}

/** Un club en pocas palabras (`ClubCompact`). */
data class ClubCompacto(val id: Int, val nombre: String, val visibilidad: String) {
    companion object {
        fun de(json: JSONObject) = ClubCompacto(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), json.texto("Visibilidad").orEmpty())
    }
}

/** A qué lleva una tarjeta dentro del club (`ClubInternalDestination`): un debate, una encuesta, un evento… */
data class DestinoEnClub(val tipo: String, val id: Int) {
    companion object {
        fun de(json: JSONObject) = DestinoEnClub(json.texto("Tipo").orEmpty(), json.entero("Id") ?: 0)
    }
}

/** Un evento próximo de los clubes de la persona (`ClubUpcomingEvent`). */
data class EventoProximo(
    val id: Int,
    val club: ClubCompacto,
    val hitoId: Int?,
    val titulo: String,
    val descripcionMarkdown: String?,
    val fechaInicio: String,
    val fechaFin: String?,
    val enCurso: Boolean,
    val destino: DestinoEnClub?,
) {
    companion object {
        fun de(json: JSONObject) = EventoProximo(
            id = json.entero("Id") ?: 0,
            club = ClubCompacto.de(json.objeto("Club") ?: JSONObject()),
            hitoId = json.entero("HitoId"),
            titulo = json.texto("Titulo").orEmpty(),
            descripcionMarkdown = json.texto("DescripcionMarkdown"),
            fechaInicio = json.texto("FechaInicio").orEmpty(),
            fechaFin = json.texto("FechaFin"),
            enCurso = json.booleano("EnCurso") ?: false,
            destino = json.objeto("Destino")?.let(DestinoEnClub::de),
        )
    }
}

/** El cursor de los eventos próximos (`cursorFechaInicio`, `cursorId`). */
data class CursorDeEventos(val fechaInicio: String, val id: Int) {
    companion object {
        fun de(json: JSONObject?): CursorDeEventos? =
            json?.let { CursorDeEventos(it.texto("cursorFechaInicio").orEmpty(), it.entero("cursorId") ?: 0) }
    }
}

/** El cursor del descubrimiento de clubes (`cursorFecha`, `cursorId`). */
data class CursorDeClubes(val fecha: String, val id: Int) {
    companion object {
        fun de(json: JSONObject?): CursorDeClubes? = json?.let { CursorDeClubes(it.texto("cursorFecha").orEmpty(), it.entero("cursorId") ?: 0) }
    }
}

/**
 * El resumen de clubes de la pestaña Comunidad (`/clubes-lectura/resumen`), con lo mismo que lee la web: si tiene
 * clubes, los suyos, los eventos próximos y los clubes públicos más activos. Las bandejas de acceso pasan a los
 * espacios de la plataforma.
 */
data class ResumenDeClubes(
    val tieneClubes: Boolean,
    val clubesPropios: List<ResumenDeClub>,
    val proximosEventos: List<EventoProximo>,
    val clubesPublicosActivos: List<ResumenDeClub>,
) {
    companion object {
        fun de(json: JSONObject) = ResumenDeClubes(
            tieneClubes = json.booleano("TieneClubes") ?: false,
            clubesPropios = json.lista("ClubesPropios", ResumenDeClub::de),
            proximosEventos = json.lista("ProximosEventos", EventoProximo::de),
            clubesPublicosActivos = json.lista("ClubesPublicosActivos", ResumenDeClub::de),
        )
    }
}

/** «Mis clubes» (`/clubes-lectura/mios`). */
data class MisClubes(val tieneClubes: Boolean, val total: Int, val clubes: List<ResumenDeClub>) {
    companion object {
        fun de(json: JSONObject) = MisClubes(
            tieneClubes = json.booleano("TieneClubes") ?: false,
            total = json.entero("Total") ?: 0,
            clubes = json.lista("Clubes", ResumenDeClub::de),
        )
    }
}

/** Una página del descubrimiento de clubes (`ClubDiscoveryPage`). */
data class PaginaDeClubes(val clubes: List<ResumenDeClub>, val siguiente: CursorDeClubes?) {
    companion object {
        fun de(json: JSONObject) = PaginaDeClubes(json.lista("Clubes", ResumenDeClub::de), CursorDeClubes.de(json.objeto("SiguienteCursor")))
    }
}

/** Una página de eventos próximos (`/clubes-lectura/mios/eventos/proximos`). */
data class PaginaDeEventos(val eventos: List<EventoProximo>, val siguiente: CursorDeEventos?) {
    companion object {
        fun de(json: JSONObject) = PaginaDeEventos(json.lista("Eventos", EventoProximo::de), CursorDeEventos.de(json.objeto("SiguienteCursor")))
    }
}

/** Un miembro de un club, como lo manda el detalle del club (`ClubMember`). */
data class MiembroDeClub(val id: Int, val nombre: String, val imagen: String?, val rol: String) {
    companion object {
        fun de(json: JSONObject) = MiembroDeClub(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), json.texto("Imagen"), json.texto("Rol").orEmpty())
    }
}

/** El detalle de un club (`GET /clubes-lectura/{id}`, que llega dentro de `Club`). */
data class DetalleDeClub(
    val id: Int,
    val nombre: String,
    val descripcionMarkdown: String?,
    val visibilidad: String,
    val propietarioId: Int,
    val miembros: List<MiembroDeClub>,
    val siguienteCursorMiembros: Int?,
    val miembrosActivos: Int,
    val publicaciones: Int,
    val mensajes: Int,
    /** El espacio del club en la plataforma: entrar, pedir entrar, invitar, salir y el canal. */
    val espacioId: Long? = null,
    /** La conversación del espacio en el chat de la plataforma; `null` hasta que la plataforma la da. */
    val conversacionId: Long? = null,
) {
    companion object {
        fun de(json: JSONObject): DetalleDeClub {
            val metricas = json.objeto("Metricas")
            return DetalleDeClub(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                descripcionMarkdown = json.texto("DescripcionMarkdown"),
                visibilidad = json.texto("Visibilidad").orEmpty(),
                propietarioId = json.entero("PropietarioId") ?: 0,
                miembros = json.lista("MiembrosDetalle", MiembroDeClub::de),
                siguienteCursorMiembros = json.objeto("SiguienteCursorMiembros")?.entero("cursorId"),
                miembrosActivos = metricas?.entero("MiembrosActivos") ?: 0,
                publicaciones = metricas?.entero("Publicaciones") ?: 0,
                mensajes = metricas?.entero("Mensajes") ?: 0,
                espacioId = json.entero("EspacioId")?.toLong(),
                conversacionId = json.entero("ConversacionId")?.toLong(),
            )
        }
    }
}

/** Una lectura del club, la actual ([activa]) o una pasada (`ClubReading`). */
data class LecturaDeClub(
    val id: Int,
    val objetivo: ObjetivoDeClub?,
    val fechaInicio: String?,
    val fechaFin: String?,
    val objetivoTexto: String?,
    val activa: Boolean,
    val fechaCierre: String?,
) {
    companion object {
        fun de(json: JSONObject) = LecturaDeClub(
            id = json.entero("Id") ?: 0,
            objetivo = json.objeto("Objetivo")?.let(ObjetivoDeClub::de),
            fechaInicio = json.texto("FechaInicio"),
            fechaFin = json.texto("FechaFin"),
            objetivoTexto = json.texto("ObjetivoTexto"),
            activa = json.booleano("Activa") ?: false,
            fechaCierre = json.texto("FechaCierre"),
        )
    }
}

/** El progreso de la persona en una lectura del club (`ClubProgress`). */
data class ProgresoEnClub(val lecturaId: Int, val paginaActual: Double?, val capituloActual: String?, val compartir: Boolean, val fechaActualizacion: String?) {
    companion object {
        fun de(json: JSONObject) = ProgresoEnClub(
            lecturaId = json.entero("LecturaId") ?: 0,
            paginaActual = json.decimal("PaginaActual"),
            capituloActual = json.texto("CapituloActual"),
            compartir = json.booleano("Compartir") ?: false,
            fechaActualizacion = json.texto("FechaActualizacion"),
        )
    }
}

/** Un hito de lectura (`ClubMilestone`): una página, un capítulo o un evento. */
data class HitoDeClub(
    val id: Int,
    val lecturaId: Int?,
    /** `pagina`, `capitulo` o `evento`. */
    val tipo: String,
    val referenciaInicio: Double?,
    val referenciaFin: Double?,
    val titulo: String,
    val objetivoTexto: String?,
    val fechaOrientativa: String?,
) {
    companion object {
        fun de(json: JSONObject) = HitoDeClub(
            id = json.entero("Id") ?: 0,
            lecturaId = json.entero("LecturaId"),
            tipo = json.texto("Tipo").orEmpty(),
            referenciaInicio = json.decimal("ReferenciaInicio"),
            referenciaFin = json.decimal("ReferenciaFin"),
            titulo = json.texto("Titulo").orEmpty(),
            objetivoTexto = json.texto("ObjetivoTexto"),
            fechaOrientativa = json.texto("FechaOrientativa"),
        )
    }
}

/** Un evento del calendario del club (`ClubCalendarEvent`). */
data class EventoDeClub(val id: Int, val hitoId: Int?, val titulo: String, val descripcionMarkdown: String?, val fechaInicio: String, val fechaFin: String?) {
    companion object {
        fun de(json: JSONObject) = EventoDeClub(
            id = json.entero("Id") ?: 0,
            hitoId = json.entero("HitoId"),
            titulo = json.texto("Titulo").orEmpty(),
            descripcionMarkdown = json.texto("DescripcionMarkdown"),
            fechaInicio = json.texto("FechaInicio").orEmpty(),
            fechaFin = json.texto("FechaFin"),
        )
    }
}

/** El spoiler de un debate o un comentario (`ClubSpoiler`); [oculto] si el progreso de la persona no llega. */
data class SpoilerDeClub(val paginaInicio: Double?, val paginaFin: Double?, val capituloInicioId: Int?, val capituloFinId: Int?, val oculto: Boolean) {
    companion object {
        fun de(json: JSONObject?) = SpoilerDeClub(
            paginaInicio = json?.decimal("PaginaInicio"),
            paginaFin = json?.decimal("PaginaFin"),
            capituloInicioId = json?.entero("CapituloInicioId"),
            capituloFinId = json?.entero("CapituloFinId"),
            oculto = json?.booleano("Oculto") ?: false,
        )
    }
}

/** Un debate del club (`ClubDebate`). */
data class DebateDeClub(
    val id: Int,
    val lecturaId: Int?,
    val hitoId: Int?,
    val autor: Persona,
    val titulo: String,
    val contenidoMarkdown: String?,
    val spoiler: SpoilerDeClub,
    val fechaCreacion: String?,
) {
    companion object {
        fun de(json: JSONObject) = DebateDeClub(
            id = json.entero("Id") ?: 0,
            lecturaId = json.entero("LecturaId"),
            hitoId = json.entero("HitoId"),
            autor = Persona.de(json.objeto("Autor") ?: JSONObject()),
            titulo = json.texto("Titulo").orEmpty(),
            contenidoMarkdown = json.texto("ContenidoMarkdown"),
            spoiler = SpoilerDeClub.de(json.objeto("Spoiler")),
            fechaCreacion = json.texto("FechaCreacion"),
        )
    }
}

/** Un comentario de un debate (`ClubDebateComment`). */
data class ComentarioDeDebate(val id: Int, val autor: Persona, val contenidoMarkdown: String?, val spoiler: SpoilerDeClub, val fechaCreacion: String?) {
    companion object {
        fun de(json: JSONObject) = ComentarioDeDebate(
            id = json.entero("Id") ?: 0,
            autor = Persona.de(json.objeto("Autor") ?: JSONObject()),
            contenidoMarkdown = json.texto("ContenidoMarkdown"),
            spoiler = SpoilerDeClub.de(json.objeto("Spoiler")),
            fechaCreacion = json.texto("FechaCreacion"),
        )
    }
}

/** Un debate con sus comentarios (`ClubDebateDetail`). */
data class DetalleDeDebate(val debate: DebateDeClub, val comentarios: List<ComentarioDeDebate>) {
    companion object {
        fun de(json: JSONObject) = DetalleDeDebate(
            debate = DebateDeClub.de(json.objeto("Debate") ?: JSONObject()),
            comentarios = json.lista("Comentarios", ComentarioDeDebate::de),
        )
    }
}

/** Una opción de una encuesta; [totalVotos] es `null` hasta votar o hasta que se cierra (`ClubPollOption`). */
data class OpcionDeEncuesta(val id: Int, val texto: String, val totalVotos: Int?) {
    companion object {
        fun de(json: JSONObject) = OpcionDeEncuesta(json.entero("Id") ?: 0, json.texto("Texto").orEmpty(), json.entero("TotalVotos"))
    }
}

/**
 * Una encuesta del club (`ClubPoll`). [miVotoVersion] es el token opaco del voto de la persona (16 cifras
 * hexadecimales según el OpenAPI; la web lo tipa como número): se guarda como texto y se devuelve tal cual al votar.
 * TODO(contrato): `ClubPoll.MiVotoVersion` es texto en el OpenAPI y número en `community.ts`.
 */
data class EncuestaDeClub(
    val id: Int,
    val pregunta: String,
    val fechaCierre: String?,
    val cerrada: Boolean,
    val miVotoId: Int?,
    val miVotoVersion: String?,
    val opciones: List<OpcionDeEncuesta>,
) {
    companion object {
        fun de(json: JSONObject) = EncuestaDeClub(
            id = json.entero("Id") ?: 0,
            pregunta = json.texto("Pregunta").orEmpty(),
            fechaCierre = json.texto("FechaCierre"),
            cerrada = json.booleano("Cerrada") ?: false,
            miVotoId = json.entero("MiVotoId"),
            miVotoVersion = json.texto("MiVotoVersion"),
            opciones = json.lista("Opciones", OpcionDeEncuesta::de),
        )
    }
}

/** El club recién creado y su espacio (`201 { Id, EspacioId }`). */
data class ClubCreado(val id: Int, val espacioId: Long?) {
    companion object {
        fun de(json: JSONObject) = ClubCreado(json.entero("Id") ?: 0, json.entero("EspacioId")?.toLong())
    }
}

/** Una publicación de un club, de solo lectura (`ClubPublication`); [contenidoMarkdown] es `null` si la oculta un spoiler. */
data class PublicacionDeClub(
    val id: Int,
    val titulo: String?,
    val contenidoMarkdown: String?,
    val autor: Persona,
    val spoilerOculto: Boolean,
    val fechaCreacion: String?,
) {
    companion object {
        fun de(json: JSONObject) = PublicacionDeClub(
            id = json.entero("Id") ?: 0,
            titulo = json.texto("Titulo"),
            contenidoMarkdown = json.texto("ContenidoMarkdown"),
            autor = Persona.de(json.objeto("Autor") ?: JSONObject()),
            spoilerOculto = json.objeto("Spoiler")?.booleano("Oculto") ?: false,
            fechaCreacion = json.texto("FechaCreacion"),
        )
    }
}

/** Una página de publicaciones (`{ Publicaciones, SiguienteCursor }`), con el cursor del descubrimiento. */
data class PaginaDePublicaciones(val publicaciones: List<PublicacionDeClub>, val siguiente: CursorDeClubes?) {
    companion object {
        fun de(json: JSONObject) = PaginaDePublicaciones(json.lista("Publicaciones", PublicacionDeClub::de), CursorDeClubes.de(json.objeto("SiguienteCursor")))
    }
}

/**
 * El resumen de la pestaña Comunidad de Libros (`GET /comunidad/resumen`): solo los clubes activos. [activos] es `null`
 * si ese bloque falló ([parcial]).
 */
data class ResumenDeComunidad(val parcial: Boolean, val activos: Int?) {
    companion object {
        fun de(json: JSONObject) = ResumenDeComunidad(
            parcial = json.booleano("Parcial") ?: false,
            activos = json.objeto("Resumen")?.objeto("Clubes")?.entero("Activos"),
        )
    }
}

/**
 * Las capacidades de la comunidad (`GET /comunidad/capacidades`): solo se mira `clubes`. Con [conservadora], todo
 * apagado. Se vuelven a pedir pasados [ttlSegundos].
 */
data class CapacidadesDeComunidad(val clubes: Boolean, val conservadora: Boolean, val ttlSegundos: Int) {
    val clubesActivos: Boolean get() = !conservadora && clubes

    companion object {
        /** Lo que se usa si no se pueden pedir: todo apagado, cinco minutos. */
        val CONSERVADORAS = CapacidadesDeComunidad(clubes = false, conservadora = true, ttlSegundos = 300)

        fun de(json: JSONObject) = CapacidadesDeComunidad(
            clubes = json.objeto("Capacidades")?.objeto("clubes")?.booleano("Activa") ?: false,
            conservadora = json.booleano("Conservadora") ?: false,
            ttlSegundos = json.entero("CacheTtlSegundos") ?: 300,
        )
    }
}
