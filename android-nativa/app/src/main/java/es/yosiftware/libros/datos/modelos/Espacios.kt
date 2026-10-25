package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

// Los espacios de la plataforma tal como los usa Libros (`interfaces/platform-spaces.ts` de la web; ecosistema-kit/
// ESPACIOS.md). Cada club es un espacio con `idExterno` `club-<Id>`: la plataforma lleva quién está, con qué rol y cómo
// se entra, y Libros todo lo demás del club. Los ids de los espacios, invitaciones y solicitudes son números; los de
// las cuentas, texto.

/** El club de Libros de un espacio (`clubIdFromSpace`): `club-<Id>`, o `null` si no es de un club. */
fun clubDeEspacio(idExterno: String?): Int? =
    Regex("^club-(\\d+)$").find(idExterno.orEmpty())?.groupValues?.get(1)?.toIntOrNull()?.takeIf { it > 0 }

/** Lo de la persona en un espacio, para enseñar u ocultar botones; la autorización es de la API. */
data class YoEnEspacio(
    val rol: String?,
    val nombreRol: String?,
    val propietario: Boolean,
    /** `activo` o `sin_dos_pasos`. */
    val estado: String,
    val gestionar: Boolean,
    val invitar: Boolean,
    /** `escribir`, `leer` o `nada`. */
    val chat: String,
) {
    companion object {
        fun de(json: JSONObject): YoEnEspacio {
            val capacidades = json.objeto("capacidades") ?: JSONObject()
            return YoEnEspacio(
                rol = json.texto("rol"),
                nombreRol = json.texto("nombreRol"),
                propietario = json.booleano("propietario") ?: false,
                estado = json.texto("estado").orEmpty(),
                gestionar = capacidades.booleano("gestionar") ?: false,
                invitar = capacidades.booleano("invitar") ?: false,
                chat = capacidades.texto("chat") ?: "nada",
            )
        }
    }
}

/** Un espacio de la plataforma (`EspacioPlataforma`). */
data class Espacio(
    val id: Long,
    val idExterno: String,
    val nombre: String,
    /** `invitacion`, `solicitud` o `abierto`. */
    val entrada: String,
    val dosPasos: Boolean,
    val miembros: Int,
    val conversacion: Long?,
    val yo: YoEnEspacio?,
) {
    val clubId: Int? get() = clubDeEspacio(idExterno)

    companion object {
        fun de(json: JSONObject) = Espacio(
            id = json.entero("id")?.toLong() ?: 0,
            idExterno = json.texto("idExterno").orEmpty(),
            nombre = json.texto("nombre").orEmpty(),
            entrada = json.texto("entrada").orEmpty(),
            dosPasos = json.booleano("dosPasos") ?: false,
            miembros = json.entero("miembros") ?: 0,
            conversacion = json.entero("conversacion")?.toLong(),
            yo = json.objeto("yo")?.let(YoEnEspacio::de),
        )
    }
}

/** Una invitación pendiente de la persona (`InvitacionRecibida`). */
data class InvitacionRecibida(
    val id: Long,
    val espacioId: Long,
    val idExterno: String,
    val espacio: String,
    val dosPasos: Boolean,
    /** El nombre de quien invita. */
    val de: String?,
    val rol: String?,
    val nombreRol: String?,
    val miembros: Int?,
    val caduca: String?,
) {
    val clubId: Int? get() = clubDeEspacio(idExterno)

    companion object {
        fun de(json: JSONObject): InvitacionRecibida {
            val espacio = json.objeto("espacio") ?: JSONObject()
            return InvitacionRecibida(
                id = json.entero("id")?.toLong() ?: 0,
                espacioId = espacio.entero("id")?.toLong() ?: 0,
                idExterno = espacio.texto("idExterno").orEmpty(),
                espacio = espacio.texto("nombre").orEmpty(),
                dosPasos = espacio.booleano("dosPasos") ?: false,
                de = json.objeto("de")?.texto("nombre"),
                rol = json.texto("rol"),
                nombreRol = json.texto("nombreRol"),
                miembros = json.entero("miembros"),
                caduca = json.texto("caduca"),
            )
        }
    }
}

/** Una invitación pendiente de un espacio, para quien puede invitar (`InvitacionEnviada`). */
data class InvitacionEnviada(
    val id: Long,
    /** `null` en una invitación a un correo. */
    val cuenta: String?,
    val alias: String?,
    /** Enmascarado. */
    val correo: String?,
    val rol: String?,
    val creada: String?,
    val caduca: String?,
) {
    companion object {
        fun de(json: JSONObject) = InvitacionEnviada(
            id = json.entero("id")?.toLong() ?: 0,
            cuenta = json.texto("cuenta"),
            alias = json.texto("alias"),
            correo = json.texto("correo"),
            rol = json.texto("rol"),
            creada = json.texto("creada"),
            caduca = json.texto("caduca"),
        )
    }
}

/** Una solicitud para entrar en un espacio, para quien puede invitar (`SolicitudDeEntrada`). */
data class SolicitudDeEntrada(val id: Long, val cuenta: String, val alias: String, val nombre: String?, val mensaje: String?, val creada: String?) {
    /** Cómo se nombra en los clubes a una persona de la plataforma (`clubPersonName`): su nombre o `@alias`. */
    val visible: String get() = nombre?.takeIf { it.isNotBlank() } ?: "@$alias"

    companion object {
        fun de(json: JSONObject) = SolicitudDeEntrada(
            id = json.entero("id")?.toLong() ?: 0,
            cuenta = json.texto("cuenta").orEmpty(),
            alias = json.texto("alias").orEmpty(),
            nombre = json.texto("nombre"),
            mensaje = json.texto("mensaje"),
            creada = json.texto("creada"),
        )
    }
}

/** Una persona de la plataforma en la búsqueda para invitar (`PlataformaPersona`). [avatar] es la ruta de la miniatura. */
data class PersonaDeYosiftware(val id: String, val alias: String, val nombre: String?, val avatar: String?, val borrada: Boolean) {
    val visible: String get() = nombre?.takeIf { it.isNotBlank() } ?: "@$alias"

    companion object {
        fun de(json: JSONObject) = PersonaDeYosiftware(
            id = json.texto("id").orEmpty(),
            alias = json.texto("alias").orEmpty(),
            nombre = json.texto("nombre"),
            avatar = json.objeto("avatar")?.texto("miniatura"),
            borrada = json.booleano("borrada") ?: false,
        )
    }
}

/** Los contadores de lo social de la persona en la plataforma (`GET /v1/social/resumen`). */
data class ResumenSocial(val solicitudesRecibidas: Int, val solicitudesEnviadas: Int, val amistades: Int, val seguidos: Int, val seguidores: Int, val bloqueos: Int) {
    companion object {
        fun de(json: JSONObject) = ResumenSocial(
            solicitudesRecibidas = json.entero("solicitudesRecibidas") ?: 0,
            solicitudesEnviadas = json.entero("solicitudesEnviadas") ?: 0,
            amistades = json.entero("amistades") ?: 0,
            seguidos = json.entero("seguidos") ?: 0,
            seguidores = json.entero("seguidores") ?: 0,
            bloqueos = json.entero("bloqueos") ?: 0,
        )
    }
}

internal fun espacios(json: JSONObject) = json.lista("espacios", Espacio::de)
