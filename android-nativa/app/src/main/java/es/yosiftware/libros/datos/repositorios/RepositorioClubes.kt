package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.modelos.CursorDeClubes
import es.yosiftware.libros.datos.modelos.CursorDeEventos
import es.yosiftware.libros.datos.modelos.DebateDeClub
import es.yosiftware.libros.datos.modelos.DetalleDeClub
import es.yosiftware.libros.datos.modelos.DetalleDeDebate
import es.yosiftware.libros.datos.modelos.EncuestaDeClub
import es.yosiftware.libros.datos.modelos.EventoDeClub
import es.yosiftware.libros.datos.modelos.HitoDeClub
import es.yosiftware.libros.datos.modelos.LecturaDeClub
import es.yosiftware.libros.datos.modelos.MisClubes
import es.yosiftware.libros.datos.modelos.PaginaDeClubes
import es.yosiftware.libros.datos.modelos.PaginaDeEventos
import es.yosiftware.libros.datos.modelos.ProgresoEnClub
import es.yosiftware.libros.datos.modelos.ResumenDeClub
import es.yosiftware.libros.datos.modelos.ResumenDeClubes
import es.yosiftware.libros.datos.modelos.SpoilerDeClub
import es.yosiftware.libros.datos.red.ClienteLibros
import org.json.JSONObject

/**
 * El contenido propio de los clubes de lectura (`community.service.ts`, la parte de `/clubes-lectura`): resumen, mis
 * clubes, descubrimiento, detalle, lecturas, progreso, hitos, calendario, debates y encuestas.
 *
 * Lo que no está aquí, a propósito (decisiones 5 y 6 del roadmap):
 * - la pertenencia (unirse, pedir entrar, invitar, aceptar, salir, cambiar el rol o quitar a un miembro, y las
 *   bandejas de solicitudes e invitaciones) va por los espacios de la plataforma, con `sesion.espacios`;
 * - la conversación del club (`/chat/clubes/{id}`) es la del chat de la plataforma (hito 12).
 *
 * TODO(contrato): la fase 4 de la API (clubes con espacios) puede cambiar las rutas de crear, borrar y restaurar un club
 * y los miembros del detalle; hoy son las del OpenAPI actual.
 */
class RepositorioClubes(private val api: ClienteLibros) {
    suspend fun resumen(): ResumenDeClubes = api.get("clubes-lectura/resumen").objeto(ResumenDeClubes::de)

    suspend fun mios(): MisClubes = api.get("clubes-lectura/mios").objeto(MisClubes::de)

    /** Todos los clubes visibles, sin filtros (`clubs()` de la web). */
    suspend fun todos(): List<ResumenDeClub> = api.get("clubes-lectura").objeto().lista("Clubes", ResumenDeClub::de)

    suspend fun eventosProximos(cursor: CursorDeEventos? = null): PaginaDeEventos = api.get(
        "clubes-lectura/mios/eventos/proximos",
        mapOf("limit" to 20, "cursorFechaInicio" to cursor?.fechaInicio, "cursorId" to cursor?.id),
    ).objeto(PaginaDeEventos::de)

    /** El descubrimiento: por texto y, si se da, por lo que leen ([tipoObjetivo] y [objetivoId] van juntos). */
    suspend fun descubrir(texto: String? = null, tipoObjetivo: String? = null, objetivoId: Int? = null, cursor: CursorDeClubes? = null): PaginaDeClubes {
        val conObjetivo = tipoObjetivo != null && objetivoId != null
        return api.get(
            "clubes-lectura",
            mapOf(
                "limit" to 20,
                "q" to texto?.trim(),
                "tipoObjetivo" to tipoObjetivo.takeIf { conObjetivo },
                "objetivoId" to objetivoId.takeIf { conObjetivo },
                "cursorFecha" to cursor?.fecha,
                "cursorId" to cursor?.id,
            ),
        ).objeto(PaginaDeClubes::de)
    }

    suspend fun club(id: Int): DetalleDeClub = DetalleDeClub.de(api.get("clubes-lectura/$id").objeto().objeto("Club") ?: JSONObject())

    /** Crea un club (`abierto` o `cerrado`) y devuelve su id. */
    suspend fun crear(nombre: String, visibilidad: String, descripcionMarkdown: String? = null): Int =
        api.post("clubes-lectura", json("Nombre" to nombre, "DescripcionMarkdown" to descripcionMarkdown, "Visibilidad" to visibilidad)).objeto().entero("Id") ?: 0

    suspend fun borrar(id: Int) {
        api.delete("clubes-lectura/$id")
    }

    suspend fun restaurar(id: Int) {
        api.post("clubes-lectura/$id/restaurar", JSONObject())
    }

    // ---------- Lecturas y progreso ----------

    suspend fun lecturas(id: Int): List<LecturaDeClub> = api.get("clubes-lectura/$id/lecturas").objeto().lista("Lecturas", LecturaDeClub::de)

    suspend fun cambiarLecturaActual(id: Int, tipoObjetivo: String, objetivoId: Int, fechaInicio: String? = null, fechaFin: String? = null, objetivoTexto: String? = null) {
        api.put(
            "clubes-lectura/$id/lectura-actual",
            json("Objetivo" to json("Tipo" to tipoObjetivo, "Id" to objetivoId), "FechaInicio" to fechaInicio, "FechaFin" to fechaFin, "ObjetivoTexto" to objetivoTexto),
        )
    }

    suspend fun progreso(id: Int): List<ProgresoEnClub> = api.get("clubes-lectura/$id/progreso").objeto().lista("Progresos", ProgresoEnClub::de)

    suspend fun guardarProgreso(id: Int, lecturaId: Int, paginaActual: Double?, capituloActual: String?, compartir: Boolean) {
        api.put(
            "clubes-lectura/$id/progreso",
            JSONObject().put("LecturaId", lecturaId).put("PaginaActual", paginaActual ?: JSONObject.NULL)
                .put("CapituloActual", capituloActual ?: JSONObject.NULL).put("Compartir", compartir),
        )
    }

    // ---------- Hitos y calendario ----------

    suspend fun hitos(id: Int): List<HitoDeClub> = api.get("clubes-lectura/$id/hitos", mapOf("limit" to 50)).objeto().lista("Hitos", HitoDeClub::de)

    suspend fun crearHito(
        id: Int,
        tipo: String,
        titulo: String,
        lecturaId: Int? = null,
        referenciaInicio: Double? = null,
        referenciaFin: Double? = null,
        objetivoTexto: String? = null,
        fechaOrientativa: String? = null,
    ) {
        api.post(
            "clubes-lectura/$id/hitos",
            json(
                "Tipo" to tipo, "Titulo" to titulo, "LecturaId" to lecturaId, "ReferenciaInicio" to referenciaInicio,
                "ReferenciaFin" to referenciaFin, "ObjetivoTexto" to objetivoTexto, "FechaOrientativa" to fechaOrientativa,
            ),
        )
    }

    suspend fun calendario(id: Int): List<EventoDeClub> = api.get("clubes-lectura/$id/eventos", mapOf("limit" to 100)).objeto().lista("Eventos", EventoDeClub::de)

    suspend fun crearEvento(id: Int, titulo: String, fechaInicio: String, fechaFin: String? = null, descripcionMarkdown: String? = null, hitoId: Int? = null) {
        api.post(
            "clubes-lectura/$id/eventos",
            json("Titulo" to titulo, "FechaInicio" to fechaInicio, "FechaFin" to fechaFin, "DescripcionMarkdown" to descripcionMarkdown, "HitoId" to hitoId),
        )
    }

    suspend fun borrarEvento(id: Int, eventoId: Int) {
        api.delete("clubes-lectura/$id/eventos/$eventoId")
    }

    // ---------- Debates ----------

    suspend fun debates(id: Int, revelarSpoilers: Boolean = false): List<DebateDeClub> =
        api.get("clubes-lectura/$id/debates", mapOf("limit" to 100, "revelarSpoilers" to revelarSpoilers.takeIf { it })).objeto().lista("Debates", DebateDeClub::de)

    suspend fun debate(id: Int, debateId: Int, revelarSpoilers: Boolean = false): DetalleDeDebate =
        api.get("clubes-lectura/$id/debates/$debateId", mapOf("revelarSpoilers" to revelarSpoilers.takeIf { it })).objeto(DetalleDeDebate::de)

    suspend fun crearDebate(id: Int, titulo: String, contenidoMarkdown: String, lecturaId: Int? = null, hitoId: Int? = null, spoiler: SpoilerDeClub? = null) {
        api.post(
            "clubes-lectura/$id/debates",
            json("Titulo" to titulo, "ContenidoMarkdown" to contenidoMarkdown, "LecturaId" to lecturaId, "HitoId" to hitoId, "Spoiler" to spoiler?.let(::spoilerJson)),
        )
    }

    suspend fun comentarDebate(id: Int, debateId: Int, contenidoMarkdown: String, spoiler: SpoilerDeClub? = null) {
        api.post("clubes-lectura/$id/debates/$debateId", json("ContenidoMarkdown" to contenidoMarkdown, "Spoiler" to spoiler?.let(::spoilerJson)))
    }

    // ---------- Encuestas ----------

    suspend fun encuestas(id: Int): List<EncuestaDeClub> = api.get("clubes-lectura/$id/encuestas", mapOf("limit" to 100)).objeto().lista("Encuestas", EncuestaDeClub::de)

    suspend fun crearEncuesta(id: Int, pregunta: String, opciones: List<String>, fechaCierre: String) {
        api.post("clubes-lectura/$id/encuestas", json("Pregunta" to pregunta, "Opciones" to opciones, "FechaCierre" to fechaCierre))
    }

    /** Vota [opcionId]; para cambiar un voto, con la [version] de la encuesta (`MiVotoVersion`). */
    suspend fun votar(id: Int, encuestaId: Int, opcionId: Int, version: String? = null) {
        api.put("clubes-lectura/$id/encuestas/$encuestaId/voto", json("OpcionId" to opcionId, "Version" to version))
    }

    private fun spoilerJson(spoiler: SpoilerDeClub): JSONObject = json(
        "PaginaInicio" to spoiler.paginaInicio,
        "PaginaFin" to spoiler.paginaFin,
        "CapituloInicioId" to spoiler.capituloInicioId,
        "CapituloFinId" to spoiler.capituloFinId,
    )
}
