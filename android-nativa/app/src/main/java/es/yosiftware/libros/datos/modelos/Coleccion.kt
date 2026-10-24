package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

/** La puntuación y la reseña tras guardarlas (`RatingUpdated` y `ReviewUpdated`, que no trae la puntuación). */
data class Valoracion(val puntuacion: Int?, val resena: String?, val resenaOculta: Boolean) {
    companion object {
        fun de(json: JSONObject) = Valoracion(
            puntuacion = json.entero("Puntuacion"),
            resena = json.texto("Resena"),
            resenaOculta = json.booleano("ResenaOculta") ?: false,
        )
    }
}

/**
 * Lo de la persona en una sección de una antología de su colección (`AnthologySectionCollectionContext`): sus estados,
 * su puntuación y su reseña, que se guardan dentro de la antología.
 */
data class ContextoDeSeccion(
    val antologiaId: Int,
    val libroId: Int,
    val estadoActual: EstadoDeLectura?,
    val estados: List<EstadoDeLectura>,
    val puntuacion: Int?,
    val resena: String?,
    val fechaActualizacion: String?,
) {
    companion object {
        // Los ids pueden llegar como texto: se leen como número, como `normalizeAnthologySectionContext`.
        fun de(json: JSONObject) = ContextoDeSeccion(
            antologiaId = json.entero("AntologiaId") ?: 0,
            libroId = json.entero("LibroId") ?: 0,
            estadoActual = json.objeto("EstadoActual")?.let(EstadoDeLectura::de),
            estados = json.lista("Estados", EstadoDeLectura::de),
            puntuacion = json.entero("Puntuacion"),
            resena = json.texto("Resena"),
            fechaActualizacion = json.texto("FechaActualizacion"),
        )
    }
}
