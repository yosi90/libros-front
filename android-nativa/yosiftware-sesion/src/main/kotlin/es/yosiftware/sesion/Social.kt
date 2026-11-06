package es.yosiftware.sesion

import java.net.URLEncoder
import org.json.JSONObject

/**
 * Buscar personas (por ejemplo, para invitarlas a un espacio) y el resumen de sus relaciones (1.10.0). Son rutas de la
 * API pública (`docs/publica/ENDPOINTS.md`, «Personas» y «Social»), con el token de la plataforma de [SesionYosiftware]
 * y atadas a la cuenta activa, como [EspaciosYosiftware]: si cambia mientras tanto, llega `cuenta_cambiada`.
 *
 * ```kotlin
 * val personas = sesion.social.buscarPersonas("ana")   // de 2 a 60 caracteres; si no, busqueda_no_valida
 * sesion.espacios.invitarPersona(idEspacio, personas.first().id)
 * ```
 */
class SocialYosiftware internal constructor(private val sesion: SesionYosiftware) {

    /**
     * Las cuentas activas cuyo alias empieza por [texto] o cuyo nombre lo contiene (las de perfil privado, solo por su
     * alias exacto), hasta 20. Nunca la propia ni las bloqueadas.
     */
    suspend fun buscarPersonas(texto: String): List<PersonaDeYosiftware> {
        val json = sesion.leerDeLaCuenta("GET", "/v1/personas?q=" + URLEncoder.encode(texto.trim(), "UTF-8"))
        return json.optJSONArray("personas").let { lista ->
            if (lista == null) emptyList() else (0 until lista.length()).mapNotNull { lista.optJSONObject(it) }.map { PersonaDeYosiftware.de(it, sesion.configuracion.api) }
        }
    }

    /** Cuántas relaciones tiene la persona: solicitudes de amistad, amistades, seguidos, seguidores y bloqueos. */
    suspend fun resumen(): ResumenSocial = ResumenSocial.de(sesion.leerDeLaCuenta("GET", "/v1/social/resumen"))
}

/** Lo público de otra cuenta (1.10.0). Si su perfil es privado, [nombre], [biografia] y [pronombres] son `null`. */
data class PersonaDeYosiftware(
    val id: String,
    val alias: String,
    val nombre: String?,
    val privado: Boolean,
    val avatar: AvatarDePersona?,
    val biografia: String?,
    val pronombres: String?,
    /** Una cuenta borrada: [alias] es `cuenta-borrada` y [nombre] «Cuenta borrada». */
    val borrada: Boolean,
) {
    companion object {
        /** Una persona de la API; [api] es la dirección de la API de la plataforma, para las del avatar. */
        fun de(json: JSONObject, api: String) = PersonaDeYosiftware(
            id = json.getString("id"),
            alias = json.getString("alias"),
            nombre = json.cadena("nombre"),
            privado = json.optBoolean("privado", false),
            avatar = json.optJSONObject("avatar")?.let { AvatarDePersona.de(it, api) },
            biografia = json.cadena("biografia"),
            pronombres = json.cadena("pronombres"),
            borrada = json.optBoolean("borrada", false),
        )
    }
}

/** El avatar de una persona, con sus direcciones completas en la API de la plataforma (WebP, públicas). */
data class AvatarDePersona(
    val version: Int,
    /** 256 px. */
    val direccion: String,
    /** 64 px. */
    val miniatura: String,
) {
    companion object {
        /** `{ version, url, miniatura }`, con las rutas relativas a [api]. */
        fun de(json: JSONObject, api: String): AvatarDePersona {
            val base = api.trimEnd('/')
            return AvatarDePersona(json.optInt("version"), base + json.optString("url"), base + json.optString("miniatura"))
        }
    }
}

data class ResumenSocial(
    val solicitudesRecibidas: Int,
    val solicitudesEnviadas: Int,
    val amistades: Int,
    val seguidos: Int,
    val seguidores: Int,
    val bloqueos: Int,
) {
    companion object {
        /** La respuesta de `GET /v1/social/resumen`. */
        fun de(json: JSONObject) = ResumenSocial(
            solicitudesRecibidas = json.optInt("solicitudesRecibidas"),
            solicitudesEnviadas = json.optInt("solicitudesEnviadas"),
            amistades = json.optInt("amistades"),
            seguidos = json.optInt("seguidos"),
            seguidores = json.optInt("seguidores"),
            bloqueos = json.optInt("bloqueos"),
        )
    }
}
