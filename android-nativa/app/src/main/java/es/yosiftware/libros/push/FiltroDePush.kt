package es.yosiftware.libros.push

/** Una cuenta guardada en la app, como la ve el filtro: su id, su alias y si su sesión sigue valiendo. */
data class CuentaDelMovil(val id: String, val alias: String, val caducada: Boolean)

/** Qué hacer con un push. */
sealed interface DecisionDePush {
    data object Descartar : DecisionDePush

    /** Enseñarlo; [paraAlias] si es de otra cuenta guardada («Para @alias»). */
    data class Enseñar(val paraAlias: String?) : DecisionDePush
}

/**
 * Qué push enseña Libros (decisiones del propietario del 2026-10-25):
 * - **D1.** Solo lo de Libros: las notificaciones de la web `libros`, las que la plataforma manda en su nombre
 *   (`marca`, cuando llegue: petición P1) y, mientras no llegue, las de la web social cuyo enlace es de Libros (las
 *   solicitudes de club y sus respuestas). Y el chat. Lo demás (amistades, otras webs, la seguridad de la cuenta) se ve
 *   en la web social y en la app Yosiftware. El aviso mínimo no dice de qué web es: se descarta.
 * - **U7.** Las invitaciones a espacios (`espacio.invitacion`) sin `marca` se descartan: no se sabe si son de un club.
 * - **D2.** De otra cuenta guardada, solo si esa cuenta ha iniciado sesión en la app y su sesión vale; se enseña como
 *   suya. De una que no está en la app, o caducada, no.
 */
object FiltroDePush {
    const val WEB = "libros"

    fun decidir(push: MensajeDePush, activa: String?, cuentas: List<CuentaDelMovil>, origenesDeLibros: List<String>): DecisionDePush {
        if (!esDeLibros(push, origenesDeLibros)) return DecisionDePush.Descartar
        val cuenta = push.cuenta ?: return DecisionDePush.Descartar
        if (mismaCuenta(cuenta, activa)) return DecisionDePush.Enseñar(null)
        val otra = cuentas.firstOrNull { mismaCuenta(it.id, cuenta) } ?: return DecisionDePush.Descartar
        return if (otra.caducada) DecisionDePush.Descartar else DecisionDePush.Enseñar(otra.alias)
    }

    fun esDeLibros(push: MensajeDePush, origenesDeLibros: List<String>): Boolean {
        if (push.esChat) return push.conversacion != null
        push.marca?.let { return it == WEB }
        if (push.web == WEB) return true
        if (push.tipoNotificacion == "espacio.invitacion") return false
        val enlace = push.enlace ?: return false
        return origenesDeLibros.any { origen -> enlace == origen || enlace.startsWith(origen.trimEnd('/') + "/") }
    }
}
