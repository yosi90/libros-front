package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.modelos.AvisoDelCentro
import es.yosiftware.libros.datos.modelos.Contadores
import es.yosiftware.libros.datos.modelos.PaginaDelCentro
import es.yosiftware.libros.datos.red.codificarComponente
import org.json.JSONObject

/**
 * El centro de notificaciones de la plataforma con el token de la cuenta activa (`NOTIFICACIONES.md`, «Tu propio
 * centro»). Sin `incluirOcultas`: solo vale con el token de la web social.
 */
class RepositorioAvisos(private val plataforma: LlamadaDePlataforma) {
    private suspend fun leer(metodo: String, ruta: String): JSONObject =
        plataforma.objeto(metodo, ruta, if (metodo == "POST") JSONObject() else null)

    suspend fun pagina(cursor: String? = null, sinLeer: Boolean = false): PaginaDelCentro {
        val consulta = buildString {
            append("?limite=30")
            cursor?.let { append("&cursor=").append(codificarComponente(it)) }
            if (sinLeer) append("&sinLeer=true")
        }
        return PaginaDelCentro.de(leer("GET", "/v1/notificaciones$consulta"))
    }

    suspend fun contadores(): Contadores = Contadores.de(leer("GET", "/v1/notificaciones/contador"))

    /** Al abrir la campana: todo queda visto. */
    suspend fun vistas(): Contadores = Contadores.de(leer("POST", "/v1/notificaciones/vistas"))

    /** «Marcar todas como leídas». */
    suspend fun leidas(): Contadores = Contadores.de(leer("POST", "/v1/notificaciones/leidas"))

    suspend fun leida(id: Long) {
        leer("POST", "/v1/notificaciones/$id/leida")
    }

    /** Aceptar o rechazar: devuelve la notificación ya resuelta y leída. */
    suspend fun accion(id: Long, clave: String): AvisoDelCentro =
        AvisoDelCentro.de(leer("POST", "/v1/notificaciones/$id/acciones/$clave").objeto("notificacion") ?: JSONObject())
}
