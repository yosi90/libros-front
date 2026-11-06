package es.yosiftware.libros.datos

/**
 * Los textos de error propios de la APK, para cuando no hay frase del servidor. Las frases por `code` son las del `error`
 * de la API de Libros (una sola fuente, punto 12 de los duplicados de la APK): la APK y la web ya no tienen tabla.
 */
object MensajesDeError {
    /** Sin respuesta del servidor (`connectionErrorMessage`). */
    const val SIN_CONEXION = "No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."

    /** Sin frase del servidor (ERRORES.md: «un mensaje local genérico en español»). */
    const val GENERICO = "Algo ha fallado. Inténtalo de nuevo."

    /** Bloqueo por las normas de la plataforma pendientes (`isPolicyAcceptanceBlock`): lo explica su aviso, no un error. */
    fun esBloqueoPorNormas(codigo: String?): Boolean = codigo == "platform_rules_acceptance_required"
}
