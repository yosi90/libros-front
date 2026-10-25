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

/** Lo que se manda de una sección de antología (`AnthologySectionCollectionWrite`): solo los campos que cambian. */
data class CambioDeSeccion(
    val estado: TipoDeEstado? = null,
    val puntuacion: Int? = null,
    val borrarPuntuacion: Boolean = false,
    val resena: String? = null,
    val borrarResena: Boolean = false,
)

/**
 * Lo que hay que mandar para guardar el editor de una sección (`saveAnthologySectionState`), o `null` si nada cambia.
 * Aquí sí se puede quitar la puntuación, y entonces la reseña se borra con ella.
 */
fun cambiosDeSeccion(nuevo: ValoresDeColeccion, original: ValoresDeColeccion): CambioDeSeccion? {
    val estado = nuevo.estado?.takeIf { it != original.estado }
    val puntuacionCambia = nuevo.puntuacion != original.puntuacion
    val resena = nuevo.resena.trim()
    val resenaCambia = resena != original.resena.trim()
    val borrarResena = (resenaCambia && resena.isEmpty()) || (nuevo.puntuacion == null && original.puntuacion != null)
    val cambio = CambioDeSeccion(
        estado = estado,
        puntuacion = if (puntuacionCambia) nuevo.puntuacion else null,
        borrarPuntuacion = puntuacionCambia && nuevo.puntuacion == null,
        resena = if (resenaCambia && resena.isNotEmpty() && !borrarResena) resena else null,
        borrarResena = borrarResena,
    )
    return cambio.takeIf { it != CambioDeSeccion() }
}
