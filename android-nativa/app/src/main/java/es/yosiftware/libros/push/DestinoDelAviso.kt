package es.yosiftware.libros.push

import java.net.URI
import java.net.URLDecoder

/** La pantalla de la APK a la que lleva un aviso (el push o, más adelante, el centro de la campana). */
sealed interface DestinoDelAviso {
    data object Peticiones : DestinoDelAviso
    data object Reportes : DestinoDelAviso
    data object Clubes : DestinoDelAviso
    data object MisClubes : DestinoDelAviso
    data class Club(val id: Int) : DestinoDelAviso
    data object InvitacionesRecibidas : DestinoDelAviso
    data object SolicitudesRecibidas : DestinoDelAviso
    data class Catalogo(val libro: Int? = null, val nuevos: String? = null) : DestinoDelAviso
    data object Biblioteca : DestinoDelAviso
    /** Un libro de la biblioteca (`/book/{id}`, el enlace compartido de un libro). */
    data class Libro(val id: Int) : DestinoDelAviso
    data object Estadisticas : DestinoDelAviso
    data object Comunidad : DestinoDelAviso
    data class Conversacion(val id: Long) : DestinoDelAviso

    /** Una página de Libros que la APK no tiene: el navegador, sin volver a la app (`?reportar`). */
    data class Navegador(val direccion: String) : DestinoDelAviso

    /** Otro origen (la web social, otra web del ecosistema): el sistema decide quién lo abre. */
    data class Fuera(val direccion: String) : DestinoDelAviso
}

/**
 * Qué enlace abre qué pantalla (la tabla 2.4 de la especificación del hito 12, con los enlaces que mandan la API de
 * Libros y la plataforma). [origenes] son los de la web de Libros del entorno (en QA, dos).
 */
object DestinoDeEnlace {
    fun de(push: MensajeDePush, origenes: List<String>): DestinoDelAviso {
        push.conversacion?.takeIf { push.esChat }?.let { return DestinoDelAviso.Conversacion(it) }
        return de(push.enlace, push.tipoNotificacion, origenes)
    }

    fun de(enlace: String?, tipoNotificacion: String?, origenes: List<String>): DestinoDelAviso {
        val texto = enlace?.trim().orEmpty()
        if (texto.isEmpty()) return DestinoDelAviso.Comunidad
        val uri = runCatching { URI(texto) }.getOrNull() ?: return DestinoDelAviso.Fuera(texto)
        val origen = "${uri.scheme}://${uri.authority}"
        val propio = origenes.any { it.trimEnd('/').equals(origen, ignoreCase = true) }
        val consulta = parametros(uri.rawQuery)
        if (!propio) {
            // El chat de la web social: la conversación, aquí.
            if (consulta["vista"] == "chat") consulta["conversacion"]?.toLongOrNull()?.let { return DestinoDelAviso.Conversacion(it) }
            return DestinoDelAviso.Fuera(texto)
        }
        val ruta = uri.path.orEmpty().trimEnd('/')
        val fragmento = uri.fragment.orEmpty()
        return when {
            "reportar" in consulta -> DestinoDelAviso.Navegador(texto)
            ruta.isEmpty() && fragmento.startsWith("yosi-invitaciones") -> DestinoDelAviso.InvitacionesRecibidas
            ruta.isEmpty() -> when (tipoNotificacion) {
                "espacio.solicitud" -> DestinoDelAviso.SolicitudesRecibidas
                "espacio.respuesta" -> DestinoDelAviso.MisClubes
                else -> DestinoDelAviso.Biblioteca
            }
            ruta == "/dashboard/profile" -> when (consulta["section"]) {
                "requests" -> DestinoDelAviso.Peticiones
                "reports" -> DestinoDelAviso.Reportes
                else -> DestinoDelAviso.Navegador(texto)
            }
            ruta == "/dashboard/community/clubs" ->
                if (consulta["clubTab"] == "access" && consulta["accessType"] == "invitaciones") DestinoDelAviso.InvitacionesRecibidas
                else DestinoDelAviso.Clubes
            ruta.startsWith("/dashboard/community/clubs/") ->
                ruta.removePrefix("/dashboard/community/clubs/").toIntOrNull()?.let { DestinoDelAviso.Club(it) } ?: DestinoDelAviso.Clubes
            ruta == "/dashboard/community" -> DestinoDelAviso.Comunidad
            ruta == "/dashboard/catalog" -> DestinoDelAviso.Catalogo(consulta["addBook"]?.toIntOrNull(), consulta["nuevos"]?.takeIf { it.isNotBlank() })
            ruta == "/dashboard/books" || ruta == "/dashboard" -> DestinoDelAviso.Biblioteca
            // La sección de una antología (`?anthologyId=`) no tiene pantalla propia en la APK: la web.
            ruta.startsWith("/book/") && "anthologyId" !in consulta ->
                ruta.removePrefix("/book/").toIntOrNull()?.takeIf { it > 0 }?.let { DestinoDelAviso.Libro(it) } ?: DestinoDelAviso.Biblioteca
            ruta == "/dashboard/statistics" -> DestinoDelAviso.Estadisticas
            else -> DestinoDelAviso.Navegador(texto)
        }
    }

    private fun parametros(consulta: String?): Map<String, String> = consulta.orEmpty().split('&').filter { it.isNotEmpty() }.associate { par ->
        val (clave, valor) = par.split('=', limit = 2).let { it[0] to it.getOrElse(1) { "" } }
        URLDecoder.decode(clave, "UTF-8") to URLDecoder.decode(valor, "UTF-8")
    }
}
