package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

// ---------- Peticiones de catálogo (`/peticiones/catalogo`) ----------

/**
 * Una petición de catálogo (`CatalogRequest`): dar de alta o editar un autor, universo, saga, libro o antología, o un
 * comentario (`otro`). [payload] es libre (lo que rellenó la persona), así que se guarda como llega.
 */
data class PeticionDeCatalogo(
    val id: Int,
    val usuario: Referencia?,
    /** `autor`, `universo`, `saga`, `libro`, `antologia` u `otro`. */
    val tipoEntidad: String,
    /** `alta`, `edicion` o `comentario`. */
    val accion: String,
    val entidadId: Int?,
    val isbn: String?,
    val grupoIsbn: Int?,
    val participantes: Int?,
    val payload: JSONObject,
    /** `pendiente`, `aprobada`, `rechazada` o `devuelta`. */
    val estado: String,
    val comentarioResolucion: String?,
    val fechaCreacion: String?,
    val fechaResolucion: String?,
) {
    companion object {
        fun de(json: JSONObject) = PeticionDeCatalogo(
            id = json.entero("Id") ?: 0,
            usuario = json.objeto("Usuario")?.let(Referencia::de),
            tipoEntidad = json.texto("TipoEntidad").orEmpty(),
            accion = json.texto("Accion").orEmpty(),
            entidadId = json.entero("EntidadId"),
            isbn = json.texto("ISBN"),
            grupoIsbn = json.entero("GrupoISBN"),
            participantes = json.entero("Participantes"),
            payload = json.objeto("Payload") ?: JSONObject(),
            estado = json.texto("Estado").orEmpty(),
            comentarioResolucion = json.texto("ComentarioResolucion"),
            fechaCreacion = json.texto("FechaCreacion"),
            fechaResolucion = json.texto("FechaResolucion"),
        )
    }
}

/**
 * La petición recién creada (`CatalogRequestCreated`), con el estado HTTP con el que respondió la API ([estadoHttp]: 201
 * si es nueva, 200 si se unió a una igual), como `HttpStatus` en la web.
 */
data class PeticionCreada(
    val id: Int,
    val estado: String,
    val estadoHttp: Int,
    val grupoIsbn: Int?,
    val entidadId: Int?,
    val edicionId: Int?,
) {
    companion object {
        fun de(json: JSONObject, estadoHttp: Int) = PeticionCreada(
            id = json.entero("Id") ?: 0,
            estado = json.texto("Estado").orEmpty(),
            estadoHttp = estadoHttp,
            grupoIsbn = json.entero("GrupoISBN"),
            entidadId = json.entero("EntidadId"),
            edicionId = json.entero("EdicionId"),
        )
    }
}

/** La resolución de una petición (`CatalogRequestResolved`). */
data class PeticionResuelta(
    val id: Int,
    val estado: String,
    val entidadId: Int?,
    val edicionId: Int?,
    val participantesResueltos: Int?,
    val portada: String?,
) {
    companion object {
        fun de(json: JSONObject) = PeticionResuelta(
            id = json.entero("Id") ?: 0,
            estado = json.texto("Estado").orEmpty(),
            entidadId = json.entero("EntidadId"),
            edicionId = json.entero("EdicionId"),
            participantesResueltos = json.entero("ParticipantesResueltos"),
            portada = json.texto("Portada"),
        )
    }
}

// ---------- Reportes de reseñas (`/reportes` y `/moderacion/reportes`) ----------

/** Un reporte de un grupo: quién y por qué (`ReportItem`). */
data class Reporte(val id: Int, val usuario: Referencia?, val motivo: String, val fechaCreacion: String?) {
    companion object {
        fun de(json: JSONObject) = Reporte(
            id = json.entero("Id") ?: 0,
            usuario = json.objeto("Usuario")?.let(Referencia::de),
            motivo = json.texto("Motivo").orEmpty(),
            fechaCreacion = json.texto("FechaCreacion"),
        )
    }
}

/**
 * Los reportes de una misma reseña, agrupados (`ReportGroup`): la reseña reportada ([fuente]), los reportes y su
 * resolución.
 */
data class GrupoDeReportes(
    val id: Int,
    val tipoFuente: String,
    /** `libro` o `antologia`. */
    val entidadTipo: String,
    val entidadId: Int,
    /** `pendiente`, `aceptado` o `rechazado`. */
    val estado: String,
    val totalReportes: Int,
    val fuente: FuenteDeReporte?,
    val reportes: List<Reporte>,
    val resolucion: ResolucionDeReporte?,
    val fechaCreacion: String?,
    val fechaActualizacion: String?,
) {
    companion object {
        fun de(json: JSONObject) = GrupoDeReportes(
            id = json.entero("Id") ?: 0,
            tipoFuente = json.texto("TipoFuente").orEmpty(),
            entidadTipo = json.texto("EntidadTipo").orEmpty(),
            entidadId = json.entero("EntidadId") ?: 0,
            estado = json.texto("Estado").orEmpty(),
            totalReportes = json.entero("TotalReportes") ?: 0,
            fuente = json.objeto("Fuente")?.let(FuenteDeReporte::de),
            reportes = json.lista("Reportes", Reporte::de),
            resolucion = json.objeto("Resolucion")?.let(ResolucionDeReporte::de),
            fechaCreacion = json.texto("FechaCreacion"),
            fechaActualizacion = json.texto("FechaActualizacion"),
        )
    }
}

/** La reseña reportada: de quién, de qué obra y su texto (`ReportSource`). */
data class FuenteDeReporte(val usuario: Referencia?, val obra: Referencia?, val tipoObra: String?, val resena: String?, val resenaOculta: Boolean) {
    companion object {
        fun de(json: JSONObject): FuenteDeReporte {
            val obra = json.objeto("Item")
            return FuenteDeReporte(
                usuario = json.objeto("Usuario")?.let(Referencia::de),
                obra = obra?.let(Referencia::de),
                tipoObra = obra?.texto("Tipo"),
                resena = json.texto("Resena"),
                resenaOculta = json.booleano("ResenaOculta") ?: false,
            )
        }
    }
}

/** La resolución de un grupo de reportes (`ReportResolution`). */
data class ResolucionDeReporte(val estado: String, val comentario: String?, val moderador: Referencia?, val fechaResolucion: String?) {
    companion object {
        fun de(json: JSONObject) = ResolucionDeReporte(
            estado = json.texto("Estado").orEmpty(),
            comentario = json.texto("Comentario"),
            moderador = json.objeto("Moderador")?.let(Referencia::de),
            fechaResolucion = json.texto("FechaResolucion"),
        )
    }
}

/** El reporte recién creado (`ReportCreated`): su id, el de su grupo y su estado (`pendiente`). */
data class ReporteCreado(val id: Int, val grupoId: Int, val estado: String) {
    companion object {
        fun de(json: JSONObject) = ReporteCreado(json.entero("Id") ?: 0, json.entero("GrupoId") ?: 0, json.texto("Estado").orEmpty())
    }
}
