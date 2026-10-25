package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.datos.modelos.TipoDeEstado

/** Lo que edita el editor de estado, puntuación y reseña de una obra (`CollectionStateValues`). */
data class ValoresDeColeccion(val estado: TipoDeEstado?, val puntuacion: Int?, val resena: String)

/** Una llamada que hay que hacer para guardar el editor. */
sealed interface CambioDeColeccion {
    data class Estado(val estado: TipoDeEstado) : CambioDeColeccion
    data class Puntuacion(val puntuacion: Int, val resena: String?) : CambioDeColeccion
}

/**
 * Lo que hay que mandar para guardar el editor de estado de una obra (`collectionStateRequests`, que comparten la
 * Biblioteca, el Catálogo y el Perfil). Solo va lo que cambia: cada estado que se manda crea un histórico nuevo, así que
 * repetir el actual lo duplicaría. La puntuación va con la reseña (vacía, `null`). Una puntuación o reseña que ya había
 * no se puede vaciar quitando la puntuación: devuelve el error para la persona.
 */
fun cambiosDeColeccion(nuevo: ValoresDeColeccion, original: ValoresDeColeccion): Result<List<CambioDeColeccion>> {
    val cambios = mutableListOf<CambioDeColeccion>()
    if (nuevo.estado != null && nuevo.estado != original.estado) cambios += CambioDeColeccion.Estado(nuevo.estado)
    if (nuevo.puntuacion != null) {
        if (nuevo.puntuacion != original.puntuacion || nuevo.resena.trim() != original.resena.trim())
            cambios += CambioDeColeccion.Puntuacion(nuevo.puntuacion, nuevo.resena.trim().ifEmpty { null })
    } else if (original.puntuacion != null) {
        return Result.failure(IllegalStateException("La reseña necesita una puntuación"))
    }
    return Result.success(cambios)
}
