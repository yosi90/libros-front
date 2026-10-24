package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

/** Una nota personal de lectura de un libro (`/notas`, `BookNote`). [fecha] la pone el servidor al crearla. */
data class Nota(val id: Int, val nombre: String, val descripcion: String, val fecha: String?, val libroId: Int) {
    companion object {
        fun de(json: JSONObject) = Nota(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            descripcion = json.texto("Descripcion").orEmpty(),
            fecha = json.texto("Fecha"),
            libroId = json.entero("LibroId") ?: 0,
        )
    }
}
