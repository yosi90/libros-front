package es.yosiftware.sesion

import java.net.URLDecoder
import java.net.URLEncoder
import org.json.JSONArray
import org.json.JSONObject

/**
 * Los espacios de la persona en esta app (`ecosistema-kit/ESPACIOS.md`): los suyos, sus miembros, invitar, y aceptar o
 * rechazar invitaciones. Son las rutas de la persona de la API pública (`docs/publica/ENDPOINTS.md`, «Espacios»), con
 * el token de la plataforma de [SesionYosiftware]; con un 401 renueva los tokens y repite una vez. Crear un espacio,
 * meter miembros o publicar en su canal lo hace el backend de la app con su credencial de servicio.
 *
 * ```kotlin
 * val pendientes = sesion.espacios.invitaciones()     // también las de sus correos confirmados
 * val espacio = sesion.espacios.aceptar(pendientes.first().id)
 * ```
 *
 * Los errores llegan como [ErrorSesion] con el `code` de la plataforma (`docs/publica/ERRORES.md`): por ejemplo,
 * `dos_pasos_necesarios` si el espacio exige la verificación en dos pasos y la cuenta no la tiene (ábrele
 * `sesion.direccionWebSocial("seguridad")`).
 */
class EspaciosYosiftware internal constructor(private val sesion: SesionYosiftware) {

    /** Los espacios de la persona en esta app. */
    suspend fun mios(): List<EspacioDeYosiftware> = EspacioDeYosiftware.lista(leer("GET", "/v1/espacios"))

    suspend fun espacio(id: Long): EspacioDeYosiftware = EspacioDeYosiftware.de(leer("GET", "/v1/espacios/$id"))

    /** Todos los miembros (se piden por páginas de 500). */
    suspend fun miembros(id: Long): List<MiembroDeEspacio> {
        val todos = mutableListOf<MiembroDeEspacio>()
        var desde: String? = null
        do {
            val pagina = leer("GET", "/v1/espacios/$id/miembros?limite=500" + (desde?.let { "&desde=${codificar(it)}" } ?: ""))
            todos += pagina.optJSONArray("miembros").objetos().map(MiembroDeEspacio::de)
            desde = pagina.cadena("cursor")
        } while (desde != null)
        return todos
    }

    /** Las invitaciones pendientes de la persona en esta app: a ella y a sus correos confirmados. */
    suspend fun invitaciones(): List<InvitacionAEspacio> = InvitacionAEspacio.lista(leer("GET", "/v1/espacios/invitaciones"))

    /** La invitación del enlace de un correo ([codigoDeInvitacion]), si es para esta persona. */
    suspend fun porCodigo(codigo: String): InvitacionAEspacio =
        InvitacionAEspacio.de(leer("POST", "/v1/espacios/invitaciones/por-codigo", JSONObject().put("codigo", codigo)))

    suspend fun aceptar(idInvitacion: Long): EspacioDeYosiftware =
        EspacioDeYosiftware.de(leer("POST", "/v1/espacios/invitaciones/$idInvitacion/aceptar"))

    suspend fun aceptarPorCodigo(codigo: String): EspacioDeYosiftware =
        EspacioDeYosiftware.de(leer("POST", "/v1/espacios/invitaciones/por-codigo/aceptar", JSONObject().put("codigo", codigo)))

    suspend fun rechazar(idInvitacion: Long) {
        leer("POST", "/v1/espacios/invitaciones/$idInvitacion/rechazar")
    }

    /** Invita a una persona (su id de cuenta). Sin [rol], el de por defecto. Repetirla devuelve la pendiente. */
    suspend fun invitarPersona(id: Long, cuenta: String, rol: String? = null): Long =
        leer("POST", "/v1/espacios/$id/invitaciones", JSONObject().put("cuenta", cuenta).conRol(rol)).getLong("id")

    /** Invita a un correo: le llega un enlace con el código. La respuesta es la misma tenga o no cuenta. */
    suspend fun invitarCorreo(id: Long, correo: String, rol: String? = null): Long =
        leer("POST", "/v1/espacios/$id/invitaciones", JSONObject().put("correo", correo.trim()).conRol(rol)).getLong("id")

    /** Entra en un espacio de entrada abierta. */
    suspend fun entrar(id: Long): EspacioDeYosiftware = EspacioDeYosiftware.de(leer("POST", "/v1/espacios/$id/entrar"))

    /** Sale del espacio. Quien tiene su propiedad lo traspasa antes. */
    suspend fun salir(id: Long) {
        leer("DELETE", "/v1/espacios/$id/miembros/yo")
    }

    private suspend fun leer(metodo: String, ruta: String, cuerpo: JSONObject? = null): JSONObject {
        val respuesta = sesion.llamarConToken(metodo, ruta, cuerpo)
        if (!respuesta.correcta) throw respuesta.error()
        return respuesta.json
    }

    companion object {
        /**
         * El código de una invitación por correo: lo que va tras `#yosi-invitacion=` en un enlace (un App Link de tu
         * app o la dirección que te pasan). `null` si no lo lleva.
         */
        fun codigoDeInvitacion(enlace: String): String? = enlace.substringAfter('#', "")
            .split('&')
            .firstOrNull { it.startsWith("yosi-invitacion=") }
            ?.let { URLDecoder.decode(it.removePrefix("yosi-invitacion="), "UTF-8") }
            ?.takeIf { it.isNotBlank() }

        private fun JSONObject.conRol(rol: String?): JSONObject = if (rol == null) this else put("rol", rol)

        private fun codificar(valor: String): String = URLEncoder.encode(valor, "UTF-8")
    }
}

/*
 * Los modelos de los espacios y su lectura del JSON de la plataforma (públicos desde la 1.7.0, para que una app que
 * llama a otras rutas de los espacios con su propio cliente no los vuelva a escribir). La lectura es tolerante: lo que
 * no es imprescindible para identificar algo (el id, el nombre, la web, la cuenta) toma su valor por defecto si falta.
 */

/** Los objetos de una lista JSON; vacía si falta. */
private fun JSONArray?.objetos(): List<JSONObject> = if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it) }

private fun JSONObject.entero(nombre: String): Long? = if (isNull(nombre) || !has(nombre)) null else optLong(nombre)

data class WebDelEspacio(val clave: String, val nombre: String) {
    companion object {
        /** `{ clave, nombre }`. */
        fun de(json: JSONObject) = WebDelEspacio(json.getString("clave"), json.getString("nombre"))
    }
}

/** Un espacio (un club, un grupo, una organización) de esta app, con lo de la persona en él ([yo]). */
data class EspacioDeYosiftware(
    val id: Long,
    val idExterno: String,
    val web: WebDelEspacio,
    val nombre: String,
    /** `invitacion`, `solicitud` o `abierto`. */
    val entrada: String,
    /** Si sus miembros tienen que tener la verificación en dos pasos. */
    val dosPasos: Boolean,
    /** La cuenta que tiene su propiedad. */
    val propietario: String,
    val miembros: Int,
    /** La conversación del espacio en el chat, si la app la ha pedido. */
    val conversacion: Long?,
    val creado: String,
    /** `null` si la persona no es miembro. */
    val yo: YoEnElEspacio?,
    /** El traspaso pendiente, solo para quien tiene la propiedad y para quien lo recibe. */
    val traspaso: TraspasoDelEspacio?,
) {
    companion object {
        /** Un espacio de la API (`GET /v1/espacios/{idEspacio}` y las que devuelven uno). */
        fun de(json: JSONObject) = EspacioDeYosiftware(
            id = json.getLong("id"),
            idExterno = json.optString("idExterno"),
            web = WebDelEspacio.de(json.getJSONObject("web")),
            nombre = json.getString("nombre"),
            entrada = json.optString("entrada", "invitacion"),
            dosPasos = json.optBoolean("dosPasos", false),
            propietario = json.optString("propietario"),
            miembros = json.optInt("miembros"),
            conversacion = json.entero("conversacion"),
            creado = json.optString("creado"),
            yo = json.optJSONObject("yo")?.let(YoEnElEspacio::de),
            traspaso = json.optJSONObject("traspaso")?.let(TraspasoDelEspacio::de),
        )

        /** Los de `{ "espacios": [...] }` (`GET /v1/espacios`). */
        fun lista(json: JSONObject): List<EspacioDeYosiftware> = json.optJSONArray("espacios").objetos().map(::de)
    }
}

data class YoEnElEspacio(
    val rol: String?,
    /** El nombre visible del rol, como lo declara la app. */
    val nombreRol: String?,
    val propietario: Boolean,
    /** `activo` o `sin_dos_pasos` (el espacio la exige y la cuenta no la tiene: en pausa). */
    val estado: String,
    val gestionar: Boolean,
    val invitar: Boolean,
    /** `escribir`, `leer` o `nada`, en la conversación del espacio. */
    val chat: String,
) {
    companion object {
        /** El `yo` de un espacio, con sus `capacidades`. */
        fun de(json: JSONObject): YoEnElEspacio {
            val capacidades = json.optJSONObject("capacidades") ?: JSONObject()
            return YoEnElEspacio(
                rol = json.cadena("rol"),
                nombreRol = json.cadena("nombreRol"),
                propietario = json.optBoolean("propietario", false),
                estado = json.optString("estado", "activo"),
                gestionar = capacidades.optBoolean("gestionar", false),
                invitar = capacidades.optBoolean("invitar", false),
                chat = capacidades.optString("chat", "nada"),
            )
        }
    }
}

data class TraspasoDelEspacio(val cuenta: String, val rolSaliente: String?, val caduca: String) {
    companion object {
        /** El `traspaso` de un espacio, o la respuesta de `POST /v1/espacios/{idEspacio}/traspaso`. */
        fun de(json: JSONObject) = TraspasoDelEspacio(json.getString("cuenta"), json.cadena("rolSaliente"), json.optString("caduca"))
    }
}

data class MiembroDeEspacio(
    val cuenta: String,
    val alias: String,
    /** `null` si su perfil es privado o no lo tiene. */
    val nombre: String?,
    val avatarVersion: Int?,
    val rol: String?,
    val propietario: Boolean,
    /** `activo` o `sin_dos_pasos`. */
    val estado: String,
) {
    companion object {
        /** Un miembro de `GET /v1/espacios/{idEspacio}/miembros`. */
        fun de(json: JSONObject) = MiembroDeEspacio(
            cuenta = json.getString("cuenta"),
            alias = json.getString("alias"),
            nombre = json.cadena("nombre"),
            avatarVersion = json.entero("avatarVersion")?.toInt(),
            rol = json.cadena("rol"),
            propietario = json.optBoolean("propietario", false),
            estado = json.optString("estado", "activo"),
        )
    }
}

/** Una invitación pendiente de la persona. */
data class InvitacionAEspacio(
    val id: Long,
    /** El id del espacio. */
    val espacio: Long,
    val idExterno: String,
    val nombre: String,
    val dosPasos: Boolean,
    val web: WebDelEspacio,
    val deCuenta: String,
    val deNombre: String,
    val rol: String?,
    val nombreRol: String?,
    val miembros: Int,
    val caduca: String,
) {
    companion object {
        /** Una invitación de `GET /v1/espacios/invitaciones` o de `POST /v1/espacios/invitaciones/por-codigo`. */
        fun de(json: JSONObject): InvitacionAEspacio {
            val espacio = json.getJSONObject("espacio")
            val de = json.optJSONObject("de") ?: JSONObject()
            return InvitacionAEspacio(
                id = json.getLong("id"),
                espacio = espacio.getLong("id"),
                idExterno = espacio.optString("idExterno"),
                nombre = espacio.getString("nombre"),
                dosPasos = espacio.optBoolean("dosPasos", false),
                web = WebDelEspacio.de(json.getJSONObject("web")),
                deCuenta = de.optString("cuenta"),
                deNombre = de.optString("nombre"),
                rol = json.cadena("rol"),
                nombreRol = json.cadena("nombreRol"),
                miembros = json.optInt("miembros"),
                caduca = json.optString("caduca"),
            )
        }

        /** Las de `{ "invitaciones": [...] }`. */
        fun lista(json: JSONObject): List<InvitacionAEspacio> = json.optJSONArray("invitaciones").objetos().map(::de)
    }
}
