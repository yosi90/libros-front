package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

// Las novedades de las webs tal como las cuenta la plataforma (docs/publica/ENDPOINTS.md, «Novedades de las webs»;
// ecosistema-kit/NOVEDADES.md). Con el token de Libros solo llegan las publicadas desde Libros.

/** Una novedad del feed: quién, qué ha hecho (ya redactado, sin el nombre), sus «me gusta» y sus comentarios. */
data class Novedad(
    val id: Long,
    val persona: PersonaDeYosiftware,
    val texto: String,
    val enlace: String?,
    val imagen: String?,
    val creada: String?,
    val meGusta: Int,
    val meGustaPropio: Boolean,
    val comentarios: Int,
    /** `propia`, `amistad`, `seguida` o `ninguna`. */
    val relacion: String,
    /** El banner 16:9 (ruta en la API de la plataforma) y su texto alternativo. */
    val cabecera: String?,
    val textoDeCabecera: String?,
) {
    val propia: Boolean get() = relacion == "propia"

    companion object {
        fun de(json: JSONObject): Novedad {
            val meGusta = json.objeto("meGusta")
            val cabecera = json.objeto("cabecera")
            return Novedad(
                id = json.entero("id")?.toLong() ?: 0,
                persona = PersonaDeYosiftware.de(json.objeto("persona") ?: JSONObject()),
                texto = json.texto("texto").orEmpty(),
                enlace = json.texto("enlace"),
                imagen = json.texto("imagen"),
                creada = json.texto("creada"),
                meGusta = meGusta?.entero("total") ?: 0,
                meGustaPropio = meGusta?.booleano("propio") ?: false,
                comentarios = json.entero("comentarios") ?: 0,
                relacion = json.texto("relacion") ?: "ninguna",
                cabecera = cabecera?.texto("imagen"),
                textoDeCabecera = cabecera?.texto("textoAlternativo"),
            )
        }
    }
}

/** Un comentario de una novedad. */
data class ComentarioDeNovedad(val id: Long, val persona: PersonaDeYosiftware, val texto: String, val creado: String?, val propio: Boolean) {
    companion object {
        fun de(json: JSONObject) = ComentarioDeNovedad(
            id = json.entero("id")?.toLong() ?: 0,
            persona = PersonaDeYosiftware.de(json.objeto("persona") ?: JSONObject()),
            texto = json.texto("texto").orEmpty(),
            creado = json.texto("creado"),
            propio = json.booleano("propio") ?: false,
        )
    }
}

/** Una página del feed o de los comentarios, con su cursor (`null` en la última). */
data class PaginaConCursor<T>(val elementos: List<T>, val cursor: String?)
