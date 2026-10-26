package es.yosiftware.libros.datos.cuenta

import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.objetoDe
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.red.ClientePlataforma
import es.yosiftware.libros.datos.red.codificarComponente
import org.json.JSONObject

/**
 * El perfil público de una cuenta en la plataforma (`GET /v1/perfiles/{id}`, docs/publica/ENDPOINTS.md de la
 * plataforma): lo que la app enseña de cada cuenta guardada y de la activa. Libros no guarda nombres ni avatares
 * (ecosistema-kit/LISTA_DE_COMPROBACION.md): se leen cada vez. Con el perfil privado, `nombre` llega en `null`.
 */
data class PerfilPublico(
    val id: String,
    val alias: String,
    val nombre: String?,
    /** La miniatura (64 px) con su versión, como dirección completa, o `null` si no tiene avatar. */
    val avatar: String?,
) {
    /** El nombre que se enseña: el del perfil o, si no lo hay (o es privado), el alias. */
    val visible: String get() = nombre?.takeIf { it.isNotBlank() } ?: alias

    companion object {
        /** Lee la respuesta de la plataforma. Sus rutas del avatar cuelgan del origen de la API ([api]). */
        fun de(json: JSONObject, api: String): PerfilPublico = PerfilPublico(
            id = json.texto("id").orEmpty(),
            alias = json.texto("alias").orEmpty(),
            nombre = json.texto("nombre"),
            avatar = json.objeto("avatar")?.texto("miniatura")?.let { rutaDeLaPlataforma(it, api) },
        )

        /**
         * La miniatura de la cuenta [id] sin saber su versión: es pública y no lleva token (`GET
         * /v1/perfiles/{id}/avatar/miniatura`), así que vale para las cuentas guardadas aunque no haya sesión. Sin la
         * versión, la plataforma la manda con `no-cache`; si no tiene avatar, responde 404 y se pinta la inicial.
         */
        fun miniatura(id: String, api: String): String = api.trimEnd('/') + "/v1/perfiles/" + codificarComponente(id) + "/avatar/miniatura"
    }
}

/** Una ruta de la API de la plataforma ([api]) como dirección completa (los avatares, los iconos); si ya lo es, tal cual. */
fun rutaDeLaPlataforma(ruta: String, api: String): String =
    if (ruta.startsWith("http://") || ruta.startsWith("https://")) ruta else api.trimEnd('/') + "/" + ruta.trimStart('/')

/** De dónde salen los perfiles. En la app, [PerfilesDeLaPlataforma]; en las pruebas, uno falso. */
fun interface FuenteDePerfiles {
    /** Lanza el error de la plataforma (`ErrorSesion`) o [RespuestaDeOtraCuenta] si cambió la cuenta entre medias. */
    suspend fun perfil(id: String): PerfilPublico
}

/** Con el cliente de la plataforma (el token de la cuenta activa, `conTokenDePlataforma`). */
class PerfilesDeLaPlataforma(private val cliente: ClientePlataforma, private val api: String) : FuenteDePerfiles {
    override suspend fun perfil(id: String): PerfilPublico =
        PerfilPublico.de(objetoDe(cliente.llamar("GET", "/v1/perfiles/" + codificarComponente(id))), api)
}
