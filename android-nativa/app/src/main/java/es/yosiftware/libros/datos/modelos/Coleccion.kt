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

/**
 * El último movimiento de una obra de la colección (`RecentLibraryActivity`, `GET /biblioteca/actividad_reciente`): su
 * último estado, de lo más reciente a lo más antiguo. El Perfil enseña los cuatro últimos.
 */
data class ActividadReciente(
    /** `libro` o `antologia`. */
    val tipo: String,
    val id: Int,
    val nombre: String,
    val autores: List<Autor>,
    val portada: String?,
    val estado: EstadoDeLectura?,
) {
    val esAntologia: Boolean get() = tipo == Obra.ANTOLOGIA

    /** La obra, para abrirla: el libro en su pantalla y la antología en la Biblioteca. */
    fun comoObra(): Obra = Obra(tipo, id, nombre, portada, autores, listOfNotNull(estado))

    companion object {
        fun de(json: JSONObject) = ActividadReciente(
            tipo = json.texto("Tipo").orEmpty(),
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            autores = json.lista("Autores", Autor::de),
            portada = json.texto("Portada"),
            estado = json.objeto("Estado")?.let(EstadoDeLectura::de),
        )
    }
}
