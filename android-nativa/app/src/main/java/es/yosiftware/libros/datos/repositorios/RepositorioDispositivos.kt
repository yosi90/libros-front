package es.yosiftware.libros.datos.repositorios

import org.json.JSONObject

/**
 * Este móvil en el push de la cuenta (`docs/publica/NOTIFICACIONES.md` de la plataforma, «El push»): registrarlo con el
 * FID de Firebase (idempotente: registra o pone al día, ligado a la sesión del token) y quitarlo. El acuse marca leída
 * una notificación desde el aviso, sin token: va aparte ([acuse]).
 */
class RepositorioDispositivos(private val plataforma: LlamadaDePlataforma, private val sinToken: LlamadaDePlataforma) {
    /** Devuelve el id del dispositivo, que sirve para quitarlo. */
    suspend fun registrar(fid: String, nombre: String?): Long {
        val cuerpo = JSONObject().put("fid", fid).put("plataforma", "android")
        nombre?.takeIf { it.isNotBlank() }?.let { cuerpo.put("nombre", it.take(80)) }
        return plataforma.llamar("POST", "/v1/cuenta/dispositivos", cuerpo).takeIf { it.isNotBlank() }?.let { JSONObject(it).optLong("id") } ?: 0
    }

    suspend fun quitar(id: Long) {
        plataforma.llamar("DELETE", "/v1/cuenta/dispositivos/$id", null)
    }

    /** El id de este móvil en la cuenta (`esteDispositivo`), o `null`. */
    suspend fun este(): Long? {
        val json = plataforma.llamar("GET", "/v1/cuenta/dispositivos", null).takeIf { it.isNotBlank() }?.let(::JSONObject) ?: return null
        val lista = json.optJSONArray("dispositivos") ?: return null
        return (0 until lista.length()).mapNotNull { lista.optJSONObject(it) }.firstOrNull { it.optBoolean("esteDispositivo") }?.optLong("id")
    }

    /** Marca leída la notificación del aviso pulsado. `204` también si ya no existe. */
    suspend fun acuse(acuse: String) {
        sinToken.llamar("POST", "/v1/notificaciones/acuse", JSONObject().put("acuse", acuse))
    }
}
