package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes

// Los avisos flotantes (toasts) de la app: src/app/shared/toast/ (app-toast.ts, app-toast.service.ts y
// notification-title.ts). Aquí, la lógica de la cola, sin Compose ni relojes: el tiempo lo pasa quien la usa.

/** El tipo de un aviso (`AppToastType`), con su duración por defecto. */
enum class TipoDeAviso(val duracionMs: Long) {
    EXITO(3200),
    ERROR(7200),
    INFO(4200),
    SISTEMA(7600),
}

/** Un botón dentro del aviso (`AppToastAction`). */
data class AccionDeAviso(val texto: String, val ejecutar: () -> Unit)

/** Un aviso en pantalla (`AppToast`). [repeticiones] cuenta las veces seguidas que ha llegado el mismo. */
data class Aviso(
    val id: Long,
    val clave: String,
    val tipo: TipoDeAviso,
    val titulo: String,
    val mensaje: String,
    @param:DrawableRes val icono: Int? = null,
    val accion: AccionDeAviso? = null,
    val duracionMs: Long,
    val caducaEn: Long,
    val repeticiones: Int = 1,
) {
    /** Si el título ya dice el mensaje (salvo mayúsculas y la puntuación final): entonces solo se enseña el título. */
    val soloTitulo: Boolean get() = mismoTexto(titulo, mensaje)

    companion object {
        /** `isSameToastText`. */
        fun mismoTexto(titulo: String, mensaje: String): Boolean {
            fun normalizar(texto: String) = texto.trim().replace(Regex("[.!?…\\s]+$"), "").lowercase()
            return normalizar(titulo) == normalizar(mensaje)
        }

        /**
         * El título de un aviso sin título propio (`resolveNotificationTitle`): los de la biblioteca y las preferencias
         * tienen el suyo y, si no, es la primera frase del mensaje.
         */
        fun tituloPara(tipo: TipoDeAviso, mensaje: String, propio: String? = null): String {
            propio?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
            val m = mensaje.lowercase()
            val error = tipo == TipoDeAviso.ERROR
            return when {
                "email verificado" in m -> "Correo verificado"
                "biblioteca" in m -> if (error) "No se pudo actualizar la biblioteca" else "Biblioteca actualizada"
                "norma" in m -> if (error) "No se pudieron actualizar las normas" else "Normas de comunidad actualizadas"
                "preferencias de privacidad" in m -> if (error) "No se pudo guardar la privacidad" else "Privacidad actualizada"
                "preferencias de notificaciones" in m -> if (error) "No se pudieron guardar las notificaciones" else "Notificaciones actualizadas"
                "preferencias de chat" in m -> if (error) "No se pudieron guardar las preferencias de chat" else "Preferencias de chat actualizadas"
                "preferencias de actividad" in m -> if (error) "No se pudo guardar la actividad" else "Actividad lectora actualizada"
                "push" in m -> if (error) "No se pudo activar Push" else "Notificaciones Push actualizadas"
                else -> mensaje.split(Regex("(?<=[.!?])\\s+")).firstOrNull()?.trim()?.takeIf { it.isNotEmpty() } ?: mensaje.trim()
            }
        }
    }
}

/**
 * La cola de avisos (`AppToastService`). El mismo aviso (por su [Aviso.clave]) no se repite: se sube al final con
 * «x2», y conserva su tiempo. Detenido (al arrastrarlo), no caduca; al soltarlo, recupera lo que le quedaba.
 */
class ColaDeAvisos {
    var avisos: List<Aviso> = emptyList()
        private set

    private val detenidosEn = mutableMapOf<Long, Long>()
    private var secuencia = 0L

    /** Añade un aviso; devuelve el que queda en pantalla, o `null` si el mensaje está vacío. */
    fun mostrar(
        tipo: TipoDeAviso,
        mensaje: String,
        ahora: Long,
        titulo: String? = null,
        clave: String? = null,
        @DrawableRes icono: Int? = null,
        accion: AccionDeAviso? = null,
        duracionMs: Long? = null,
    ): Aviso? {
        val texto = mensaje.trim()
        if (texto.isEmpty()) return null
        val clavePropia = clave?.trim()?.takeIf { it.isNotEmpty() }
        val claveFinal = clavePropia ?: "toast:${tipo.name.lowercase()}:$texto".lowercase()
        val duracion = duracionMs?.takeIf { it > 0 } ?: tipo.duracionMs
        val existente = avisos.firstOrNull { it.clave == claveFinal }
        // Con clave propia basta el tipo; sin ella, tiene que ser el mismo mensaje.
        val repite = existente != null && existente.tipo == tipo && (clavePropia != null || existente.mensaje == texto)
        val aviso = Aviso(
            id = existente?.id ?: ++secuencia,
            clave = claveFinal,
            tipo = tipo,
            titulo = Aviso.tituloPara(tipo, texto, titulo),
            mensaje = texto,
            icono = icono ?: existente?.icono,
            accion = accion ?: existente?.accion,
            duracionMs = existente?.duracionMs ?: duracion,
            caducaEn = existente?.caducaEn ?: (ahora + duracion),
            repeticiones = if (repite) existente.repeticiones + 1 else 1,
        )
        avisos = avisos.filter { it.id != aviso.id } + aviso
        return aviso
    }

    fun quitar(id: Long) {
        detenidosEn.remove(id)
        avisos = avisos.filter { it.id != id }
    }

    /** Quita los que han caducado (los detenidos no caducan). */
    fun caducar(ahora: Long) {
        avisos = avisos.filter { it.id in detenidosEn || it.caducaEn > ahora }
    }

    fun detener(id: Long, ahora: Long) {
        if (avisos.any { it.id == id }) detenidosEn.putIfAbsent(id, ahora)
    }

    fun seguir(id: Long, ahora: Long) {
        val desde = detenidosEn.remove(id) ?: return
        avisos = avisos.map { if (it.id == id) it.copy(caducaEn = it.caducaEn + (ahora - desde).coerceAtLeast(0)) else it }
    }

    fun estaDetenido(id: Long): Boolean = id in detenidosEn

    /** Lo que falta para el próximo que caduca, o `null` si no hay ninguno corriendo. */
    fun proximaCaducidad(): Long? = avisos.filter { it.id !in detenidosEn }.minOfOrNull { it.caducaEn }
}
