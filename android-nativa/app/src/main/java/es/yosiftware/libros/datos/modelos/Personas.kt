package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

/**
 * Una persona de la plataforma tal como la traen el chat, los avisos y las novedades (`PlataformaPersona`). [avatar] es
 * la ruta de la miniatura, relativa a la API de la plataforma. La búsqueda para invitar a un club usa la de la librería
 * de la sesión (`es.yosiftware.sesion.PersonaDeYosiftware`, con el avatar ya completo), que se llama igual: un archivo
 * no importa las dos.
 */
data class PersonaDeYosiftware(val id: String, val alias: String, val nombre: String?, val avatar: String?, val borrada: Boolean) {
    val visible: String get() = nombreVisible(nombre, alias)

    companion object {
        fun de(json: JSONObject) = PersonaDeYosiftware(
            id = json.texto("id").orEmpty(),
            alias = json.texto("alias").orEmpty(),
            nombre = json.texto("nombre"),
            avatar = json.objeto("avatar")?.texto("miniatura"),
            borrada = json.booleano("borrada") ?: false,
        )
    }
}
