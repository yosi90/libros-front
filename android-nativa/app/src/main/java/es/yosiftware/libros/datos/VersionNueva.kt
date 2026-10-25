package es.yosiftware.libros.datos

import org.json.JSONObject

/** Una versión de la APK que la plataforma sirve y que es más nueva que la instalada. */
data class VersionNueva(val version: String, val codigo: Int, val instalacion: String)

/**
 * El aviso de versión nueva (hito 12): la plataforma dice en `GET /v1/webs` (sin token) qué versión de la APK de Libros
 * sirve (`app.version`) y desde dónde se instala (`instalacion`). Hay una nueva si las dos están y su `codigo` supera el
 * de la instalada; se compara el código, no el nombre (`ENDPOINTS.md`). Cada entorno pregunta a su plataforma, que sirve
 * su propio paquete. Cualquier fallo (sin red, `registro_no_disponible`, un JSON raro) no avisa de nada.
 */
object ComprobacionDeVersion {
    const val WEB = "libros"

    fun nueva(respuesta: String, paquete: String, codigoInstalado: Int): VersionNueva? = runCatching {
        val webs = JSONObject(respuesta).optJSONArray("webs") ?: return null
        val libros = (0 until webs.length()).mapNotNull { webs.optJSONObject(it) }.firstOrNull { it.optString("clave") == WEB } ?: return null
        val instalacion = libros.optString("instalacion").takeIf { libros.opt("instalacion") is String && it.startsWith("https://") } ?: return null
        val app = libros.optJSONObject("app") ?: return null
        if (app.opt("paquete") is String && app.optString("paquete") != paquete) return null
        val version = app.optJSONObject("version") ?: return null
        val codigo = version.optInt("codigo", 0)
        if (codigo <= codigoInstalado) return null
        VersionNueva(version.optString("version").ifBlank { "$codigo" }, codigo, instalacion)
    }.getOrNull()

    /** D6: se avisa una vez por versión; [ultimaAvisada] es el código de la última de la que ya se avisó. */
    fun hayQueAvisar(nueva: VersionNueva?, ultimaAvisada: Int): Boolean = nueva != null && nueva.codigo > ultimaAvisada
}
