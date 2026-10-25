package es.yosiftware.libros.push

/**
 * Un mensaje del push de la plataforma (`docs/publica/NOTIFICACIONES.md`, «El push»): solo datos, todos texto. Copia
 * de la app Yosiftware (`apps/social-android/…/push/MensajeDePush.kt`) con `tipoNotificacion` y `marca`.
 *
 * `tipo` es `notificacion` o `chat`; `id`, `web`, `tipoNotificacion` y `acuse` solo vienen en las notificaciones, y
 * `conversacion`, en el chat. `marca` es la web en cuyo nombre avisa la plataforma (aún no llega: petición P1).
 * [cuenta] es para quién es: el campo `cuenta` o, si no viene, la cuenta que va dentro del `acuse`
 * (`<versión>.<id>.<cuenta en hex>.<firma>`); `null` si no se sabe.
 */
data class MensajeDePush(
    val tipo: String,
    val titulo: String,
    val cuerpo: String?,
    val enlace: String?,
    val icono: String?,
    val etiqueta: String,
    val id: Long?,
    val web: String?,
    val tipoNotificacion: String?,
    val marca: String?,
    val acuse: String?,
    val conversacion: Long?,
    val cuenta: String?,
) {
    val esChat: Boolean get() = tipo == "chat"

    companion object {
        /** `null` si no es un mensaje de la plataforma (le falta el título o el tipo). */
        fun de(datos: Map<String, String>): MensajeDePush? {
            val tipo = datos["tipo"]?.takeIf { it == "notificacion" || it == "chat" } ?: return null
            val titulo = datos["titulo"]?.takeIf { it.isNotBlank() } ?: return null
            val acuse = datos["acuse"].vacio()
            return MensajeDePush(
                tipo = tipo,
                titulo = titulo,
                cuerpo = datos["cuerpo"].vacio(),
                enlace = datos["enlace"].vacio(),
                icono = datos["icono"].vacio(),
                etiqueta = datos["etiqueta"].vacio() ?: "$tipo-${datos["id"] ?: datos["conversacion"] ?: titulo.hashCode()}",
                id = datos["id"]?.toLongOrNull(),
                web = datos["web"].vacio(),
                tipoNotificacion = datos["tipoNotificacion"].vacio(),
                marca = datos["marca"].vacio(),
                acuse = acuse,
                conversacion = datos["conversacion"]?.toLongOrNull(),
                cuenta = datos["cuenta"].vacio() ?: acuse?.let(::cuentaDelAcuse),
            )
        }

        /** La cuenta que firma el acuse, en hex sin guiones; `null` si no tiene esa forma. */
        fun cuentaDelAcuse(acuse: String): String? =
            acuse.split('.').takeIf { it.size == 4 }?.get(2)?.lowercase()?.takeIf { it.matches(Regex("^[0-9a-f]{32}$")) }

        private fun String?.vacio(): String? = this?.trim()?.takeIf { it.isNotEmpty() }
    }
}

/** Si dos ids de cuenta son la misma, con o sin guiones (la API los da con guiones; el acuse, en hex). */
fun mismaCuenta(una: String?, otra: String?): Boolean =
    una != null && otra != null && una.replace("-", "").equals(otra.replace("-", ""), ignoreCase = true)
