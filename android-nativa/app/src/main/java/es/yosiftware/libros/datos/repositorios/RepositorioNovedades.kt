package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.modelos.ComentarioDeNovedad
import es.yosiftware.libros.datos.modelos.Novedad
import es.yosiftware.libros.datos.modelos.PaginaConCursor
import java.net.URLEncoder
import org.json.JSONObject

/**
 * Las novedades de Libros en la plataforma (ecosistema-kit/NOVEDADES.md, «Enseñar el feed en tu web»): el feed de las
 * amistades y los seguidos, «Descubrir», los «me gusta» y los comentarios. Las publica el backend; la app solo las lee y
 * reacciona, con el token de la plataforma.
 */
class RepositorioNovedades(private val plataforma: LlamadaDePlataforma) {
    private suspend fun leer(metodo: String, ruta: String, cuerpo: JSONObject? = null): JSONObject =
        plataforma.llamar(metodo, ruta, cuerpo).takeIf { it.isNotBlank() }?.let(::JSONObject) ?: JSONObject()

    private fun conCursor(ruta: String, cursor: String?, extra: String = ""): String {
        val partes = listOfNotNull(extra.takeIf { it.isNotEmpty() }, cursor?.let { "cursor=" + URLEncoder.encode(it, "UTF-8") })
        return if (partes.isEmpty()) ruta else ruta + "?" + partes.joinToString("&")
    }

    suspend fun feed(cursor: String? = null): PaginaConCursor<Novedad> {
        val json = leer("GET", conCursor("/v1/novedades", cursor, "limite=20"))
        return PaginaConCursor(json.lista("novedades", Novedad::de), json.texto("cursor"))
    }

    suspend fun descubrir(): List<Novedad> = leer("GET", "/v1/novedades/descubrir").lista("novedades", Novedad::de)

    suspend fun meGusta(id: Long, quiero: Boolean) {
        leer(if (quiero) "PUT" else "DELETE", "/v1/novedades/$id/me-gusta", if (quiero) JSONObject() else null)
    }

    suspend fun comentarios(id: Long, cursor: String? = null): PaginaConCursor<ComentarioDeNovedad> {
        val json = leer("GET", conCursor("/v1/novedades/$id/comentarios", cursor))
        return PaginaConCursor(json.lista("comentarios", ComentarioDeNovedad::de), json.texto("cursor"))
    }

    suspend fun comentar(id: Long, texto: String): ComentarioDeNovedad =
        ComentarioDeNovedad.de(leer("POST", "/v1/novedades/$id/comentarios", JSONObject().put("texto", texto.trim().take(500))))

    suspend fun borrarComentario(id: Long, comentarioId: Long) {
        leer("DELETE", "/v1/novedades/$id/comentarios/$comentarioId")
    }
}
