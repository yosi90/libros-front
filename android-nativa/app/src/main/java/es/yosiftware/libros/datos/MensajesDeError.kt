package es.yosiftware.libros.datos

/**
 * Las frases por `code` de la APK actual (`src/app/shared/api-error-message.ts`, `productStateMessages`), para que la
 * persona lea lo mismo que ahora cuando una respuesta no trae su `error`. Solo se usan si el servidor no manda su frase:
 * el `error` del cuerpo manda siempre (ERRORES.md).
 *
 * Solo los códigos de lo que se queda en Libros. No se copian los de lo que se retira con la adhesión, que ya no puede
 * responder la API de Libros: la sesión propia y sus formas de acceso (`invalid_token`, `session_*`,
 * `access_method_*`, `phone_*`…), las preferencias de interfaz y de notificaciones, el chat (`chat_*`), las
 * restricciones de cuenta (`account_sanctioned`, `capability_sanctioned`), las normas de uso propias, la moderación y la
 * administración (`moderation_*`, `admin_*`, `appeal_*`, `community_report_*`, `policy_draft_required`…), ni los que
 * ya no emite nadie (`club_membership_limit_reached`, `club_owner_cannot_leave`).
 */
object MensajesDeError {
    /** Sin respuesta del servidor (`connectionErrorMessage`). */
    const val SIN_CONEXION = "No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."

    /** Sin frase del servidor ni de la tabla (ERRORES.md: «un mensaje local genérico en español»). */
    const val GENERICO = "Algo ha fallado. Inténtalo de nuevo."

    private val porCodigo: Map<String, String> = mapOf(
        "anthology_section_collection_forbidden" to "Esta sección se gestiona dentro de su antología.",
        "anthology_not_in_collection" to "Esta antología ya no está en tu biblioteca.",
        "anthology_section_relation_not_found" to "Esta sección ya no pertenece a la antología.",
        "club_owner_limit_reached" to "Ya administras un club propio. Solo puedes crear uno.",
        "club_post_target_unavailable" to "No puedes publicar en ese club o ya no está disponible.",
        "invalid_comment_spoiler" to "El contexto de spoiler del comentario no es válido.",
        "invalid_comment_spoiler_range" to "El rango de páginas del spoiler no es válido.",
        "invalid_comment_spoiler_chapter" to "El capítulo indicado no pertenece al libro del spoiler.",
        "comment_spoiler_incompatible_with_post" to "El spoiler del comentario debe respetar el contexto de la publicación.",
        "club_access_unavailable" to "Este club ya no está disponible para tu cuenta.",
        "club_moderator_required" to "Esta acción requiere permisos de moderación del club.",
        "club_owner_required" to "Esta acción requiere ser propietario del club.",
        "club_poll_closed" to "La encuesta ya está cerrada y se muestra en solo lectura.",
        "club_poll_vote_conflict" to "Tu voto cambió en otro momento. Revisa la encuesta antes de volver a votarla.",
        "club_reading_not_found" to "La lectura seleccionada ya no existe. Se ha actualizado el club.",
        "club_milestone_not_found" to "El hito ya no existe. Se ha actualizado el club.",
        "club_event_not_found" to "El evento ya no existe. Se ha actualizado el club.",
        "club_member_not_found" to "El miembro ya no pertenece al club. Se ha actualizado el listado.",
    )

    /** La frase de la APK actual para [codigo], o `null` si no tiene. */
    fun deCodigo(codigo: String?): String? = codigo?.let(porCodigo::get)

    /** Bloqueo por las normas de la plataforma pendientes (`isPolicyAcceptanceBlock`): lo explica su aviso, no un error. */
    fun esBloqueoPorNormas(codigo: String?): Boolean = codigo == "platform_rules_acceptance_required"
}
