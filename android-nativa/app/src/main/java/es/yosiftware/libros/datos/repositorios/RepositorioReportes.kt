package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.modelos.GrupoDeReportes
import es.yosiftware.libros.datos.modelos.ReporteCreado
import es.yosiftware.libros.datos.red.ClienteLibros

/** La resolución de un grupo de reportes (`ReportGroupResolved`). */
data class ReporteResuelto(val id: Int, val estado: String)

/**
 * Los reportes de reseñas (`report.service.ts`): reportar una reseña, «Mis reportes», y la cola y la resolución para
 * quien modera.
 */
class RepositorioReportes(private val api: ClienteLibros) {
    /** Reportar la reseña de [usuarioFuenteId] en un libro o una antología (`ReportCreate`, `TipoFuente: resena`). */
    suspend fun reportarResena(entidadTipo: String, entidadId: Int, usuarioFuenteId: Int, motivo: String): ReporteCreado =
        api.post(
            "reportes",
            json("TipoFuente" to "resena", "EntidadTipo" to entidadTipo, "EntidadId" to entidadId, "UsuarioFuenteId" to usuarioFuenteId, "Motivo" to motivo),
        ).objeto(ReporteCreado::de)

    /** La cola de quien modera (`pendiente`, `aceptado`, `rechazado` o `todos`). */
    suspend fun cola(estado: String = "pendiente"): List<GrupoDeReportes> = api.get("moderacion/reportes", mapOf("estado" to estado)).lista(GrupoDeReportes::de)

    /** «Mis reportes» (`activas`, `historial`, `todos` o un estado). */
    suspend fun mios(estado: String = "activas"): List<GrupoDeReportes> = api.get("reportes/mios", mapOf("estado" to estado)).lista(GrupoDeReportes::de)

    suspend fun resolver(grupoId: Int, estado: String, comentario: String? = null): ReporteResuelto {
        val respuesta = api.patch("moderacion/reportes/$grupoId/resolver", json("Estado" to estado, "Comentario" to comentario)).objeto()
        return ReporteResuelto(grupoId, respuesta.texto("Estado") ?: estado)
    }
}
