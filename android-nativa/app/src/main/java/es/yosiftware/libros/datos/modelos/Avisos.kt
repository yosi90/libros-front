package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

// El centro de notificaciones de la plataforma (`GET /v1/notificaciones`, docs/publica/ENDPOINTS.md, «Notificaciones»),
// copiado de `datos/Notificaciones.kt` de la app Yosiftware al estilo de Libros.

/** Un botón de enlace de una notificación. */
data class BotonDelAviso(val texto: String, val enlace: String)

/** Una acción de la plataforma (`aceptar` o `rechazar`) con su texto, mientras procede. */
data class AccionDelAviso(val clave: String, val texto: String)

/**
 * Una notificación del centro: la frase, quien la provoca, su web (y la que se ve, si la plataforma avisa en nombre de
 * otra: `marca`), los botones, las acciones y cómo se resolvió.
 */
data class AvisoDelCentro(
    val id: Long,
    val web: String,
    val nombreWeb: String,
    /** La ruta del icono cuadrado de la web que se ve, en la API; `null` en las de la plataforma. */
    val icono: String?,
    val tipo: String,
    val titulo: String,
    val cuerpo: String?,
    val enlace: String?,
    val actor: PersonaDeYosiftware?,
    val botones: List<BotonDelAviso>,
    val acciones: List<AccionDelAviso>,
    val resuelta: String?,
    val cantidad: Int,
    val creada: String,
    val actualizada: String,
    val vista: Boolean,
    val leida: Boolean,
    val marca: String?,
    /** En `logro.conseguido`: la ruta de la imagen del logro, si la hay. */
    val imagenDelLogro: String?,
) {
    companion object {
        fun de(json: JSONObject): AvisoDelCentro {
            val web = json.objeto("web") ?: JSONObject()
            val marca = json.objeto("marca")
            return AvisoDelCentro(
                id = json.optLong("id"),
                web = web.texto("clave").orEmpty(),
                nombreWeb = web.texto("nombre").orEmpty(),
                icono = marca?.texto("icono") ?: web.texto("icono"),
                tipo = json.objeto("tipo")?.texto("clave").orEmpty(),
                titulo = json.texto("titulo").orEmpty(),
                cuerpo = json.texto("cuerpo")?.takeIf { it.isNotBlank() },
                enlace = json.texto("enlace")?.takeIf { it.isNotBlank() },
                actor = json.objeto("actor")?.let(PersonaDeYosiftware::de),
                botones = json.lista("botones") { it }.mapNotNull { b ->
                    val texto = b.texto("texto") ?: return@mapNotNull null
                    BotonDelAviso(texto, b.texto("enlace") ?: return@mapNotNull null)
                },
                acciones = json.lista("acciones") { it }.mapNotNull { a ->
                    AccionDelAviso(a.texto("clave") ?: return@mapNotNull null, a.texto("texto").orEmpty())
                },
                resuelta = json.texto("resuelta")?.takeIf { it.isNotBlank() },
                cantidad = json.optInt("cantidad", 1),
                creada = json.texto("creada").orEmpty(),
                actualizada = json.texto("actualizada") ?: json.texto("creada").orEmpty(),
                vista = json.optBoolean("vista", false),
                leida = json.optBoolean("leida", false),
                marca = marca?.texto("clave"),
                imagenDelLogro = json.objeto("logro")?.texto("imagen")?.takeIf { it.isNotBlank() },
            )
        }
    }
}

/** Lo que falta por ver (el punto de la campana) y por leer. */
data class Contadores(val noVistas: Int, val noLeidas: Int) {
    companion object {
        val CERO = Contadores(0, 0)

        fun de(json: JSONObject) = Contadores(json.optInt("noVistas"), json.optInt("noLeidas"))
    }
}

/** Una página del centro, con los contadores. */
data class PaginaDelCentro(val avisos: List<AvisoDelCentro>, val cursor: String?, val contadores: Contadores) {
    companion object {
        fun de(json: JSONObject) = PaginaDelCentro(json.lista("notificaciones", AvisoDelCentro::de), json.texto("cursor"), Contadores.de(json))
    }
}
