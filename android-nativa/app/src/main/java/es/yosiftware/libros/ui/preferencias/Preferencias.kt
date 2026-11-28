package es.yosiftware.libros.ui.preferencias

/**
 * Las pestañas de Preferencias en la APK. La web móvil tiene Privacidad y Chat (`app-preferences.component.ts`), y la
 * APK de Capacitor tenía además «Permisos del móvil» (`mobile-app-permissions`, retirada con Capacitor en `8cc841f`).
 * Chat no está: gobierna las ventanas flotantes del escritorio, que no existen en el móvil. El tema, como en la web
 * móvil, se cambia en la hoja «Más». Van con la palabra, sin icono (ronda 1 de interfaz, R1).
 */
enum class PestanaDePreferencias(val etiqueta: String) {
    PRIVACIDAD("Privacidad"),
    LECTURA("Lectura y escritura"),
    PERMISOS("Permisos"),
}

/** El estado de un permiso, con los textos de `mobile-app-permissions.component.ts`. */
enum class EstadoDePermiso(val etiqueta: String) {
    CONCEDIDO("Permitido"),
    DENEGADO("Denegado"),
    REQUIERE_CONFIRMACION("Requiere confirmación"),
    SIN_SOLICITAR("Sin solicitar"),
}

/**
 * El permiso de las notificaciones. Fotos y cámara, que pedía la APK de Capacitor, no están: la APK no los usa (el avatar
 * se cambia en la web social) y no los declara. El micrófono, para el dictado, se pide al pulsarlo por primera vez.
 */
object PermisoDeNotificaciones {
    /** Android 13 (API 33): antes, las notificaciones no se piden; solo se activan o no en los ajustes. */
    const val API_CON_PERMISO = 33

    /**
     * El estado según lo que dice Android: con las notificaciones apagadas en los ajustes, «Denegado» aunque el permiso
     * esté concedido; si ya se pidió y no se concedió sin pedir explicación, Android no vuelve a preguntar.
     */
    fun estado(api: Int, concedido: Boolean, activadas: Boolean, pedirExplicacion: Boolean, yaPedido: Boolean): EstadoDePermiso = when {
        api < API_CON_PERMISO -> if (activadas) EstadoDePermiso.CONCEDIDO else EstadoDePermiso.DENEGADO
        concedido -> if (activadas) EstadoDePermiso.CONCEDIDO else EstadoDePermiso.DENEGADO
        pedirExplicacion -> EstadoDePermiso.REQUIERE_CONFIRMACION
        yaPedido -> EstadoDePermiso.DENEGADO
        else -> EstadoDePermiso.SIN_SOLICITAR
    }

    /** Si el botón pide el permiso; si no, abre los ajustes (Android ya no pregunta). */
    fun sePuedePedir(api: Int, estado: EstadoDePermiso): Boolean =
        api >= API_CON_PERMISO && (estado == EstadoDePermiso.SIN_SOLICITAR || estado == EstadoDePermiso.REQUIERE_CONFIRMACION)

    fun textoDelBoton(estado: EstadoDePermiso, solicitando: Boolean): String = when {
        solicitando -> "Solicitando…"
        estado == EstadoDePermiso.CONCEDIDO -> "Concedido"
        else -> "Conceder permiso"
    }
}
