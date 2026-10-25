import { HttpErrorResponse } from '@angular/common/http';

const productStateMessages: Record<string, string> = {
    account_deleted: 'Tu cuenta de Yosiftware se ha borrado.',
    platform_rules_acceptance_required: 'Acepta las normas de Libros para seguir.',
    anthology_section_collection_forbidden: 'Esta sección se gestiona dentro de su antología.',
    anthology_not_in_collection: 'Esta antología ya no está en tu biblioteca.',
    anthology_section_relation_not_found: 'Esta sección ya no pertenece a la antología.',
    notification_preferences_internal_error: 'No se han podido guardar las preferencias de notificaciones. Inténtalo de nuevo más tarde.',
    account_sanctioned: 'Las funciones sociales de esta cuenta están restringidas temporalmente.',
    capability_sanctioned: 'Esta acción no está disponible por una restricción de cuenta.',
    usage_policy_acceptance_required: 'Debes aceptar la política de uso antes de continuar.',
    creation_policy_acceptance_required: 'Debes aceptar la política de creación antes de publicar o modificar contenido.',
    club_owner_limit_reached: 'Ya administras un club propio. Solo puedes crear uno.',
    club_membership_limit_reached: 'Ya participas en tres clubes activos. Sal de uno antes de unirte a otro.',
    club_post_target_unavailable: 'No puedes publicar en ese club o ya no está disponible.',
    invalid_comment_spoiler: 'El contexto de spoiler del comentario no es válido.',
    invalid_comment_spoiler_range: 'El rango de páginas del spoiler no es válido.',
    invalid_comment_spoiler_chapter: 'El capítulo indicado no pertenece al libro del spoiler.',
    comment_spoiler_incompatible_with_post: 'El spoiler del comentario debe respetar el contexto de la publicación.',
    club_access_unavailable: 'Este club ya no está disponible para tu cuenta.',
    club_moderator_required: 'Esta acción requiere permisos de moderación del club.',
    club_owner_required: 'Esta acción requiere ser propietario del club.',
    club_poll_closed: 'La encuesta ya está cerrada y se muestra en solo lectura.',
    club_poll_vote_conflict: 'Tu voto cambió en otro momento. Revisa la encuesta antes de volver a votarla.',
    club_reading_not_found: 'La lectura seleccionada ya no existe. Se ha actualizado el club.',
    club_milestone_not_found: 'El hito ya no existe. Se ha actualizado el club.',
    club_event_not_found: 'El evento ya no existe. Se ha actualizado el club.',
    club_member_not_found: 'El miembro ya no pertenece al club. Se ha actualizado el listado.',
    club_owner_cannot_leave: 'La persona propietaria no puede abandonar el club; debe transferirlo o eliminarlo.',
    community_report_group_already_resolved: 'La denuncia ya había sido resuelta. Se ha actualizado la bandeja.',
    appeal_already_resolved: 'La alegación ya había sido resuelta. Se ha actualizado la cola.',
    appeal_not_available: 'La alegación ya no está disponible.',
    policy_draft_required: 'No hay un borrador publicable. Se ha recargado la política.',
    moderation_case_not_found: 'El caso ya no existe. Se ha actualizado el listado.',
    system_case_immutable: 'Este caso del sistema es de solo lectura para ese campo.',
    system_case_cannot_be_deleted: 'Los casos del sistema no pueden eliminarse.',
    moderation_case_disabled: 'El caso está deshabilitado. Se ha actualizado el listado.',
    moderation_case_has_no_stages: 'El caso no tiene etapas configuradas. Corrígelo antes de registrar el incidente.',
    moderation_stage_not_found: 'La configuración de etapas cambió. Revisa el caso antes de reintentar.',
    deleted_account_cannot_be_sanctioned: 'La cuenta fue eliminada y no puede sancionarse.',
    legacy_banned_account: 'La cuenta tiene un baneo heredado y se mantiene en solo lectura.',
    invalid_admin_users_query: 'Los filtros o el cursor de usuarios no son válidos. Revisa la búsqueda.',
    invalid_admin_user_detail_query: 'El cursor del expediente no es válido. Vuelve a abrir la ficha.',
    invalid_admin_audit_query: 'Los filtros o el cursor de auditoría no son válidos.',
    admin_user_not_found: 'La cuenta ya no existe. Se actualizará el listado.',
    admin_role_self_change_forbidden: 'No puedes modificar tu propio rol.',
    last_active_admin_required: 'Debe permanecer otra cuenta administradora activa.',
    admin_role_required: 'Selecciona un rol válido.',
    admin_role_reason_required: 'Explica el motivo del cambio de rol.',
    admin_role_not_found: 'El rol seleccionado ya no está disponible.',
    admin_backup_unavailable_in_qa: 'La descarga de backups no está disponible en el entorno de pruebas.',
    admin_backup_generation_failed: 'No se pudo generar el backup. Inténtalo de nuevo más tarde.',
    chat_membership_required: 'Ya no tienes acceso a esta conversación.',
    chat_group_not_found: 'El grupo ya no existe o no está disponible.',
    chat_group_admin_required: 'Esta acción requiere administrar el grupo.',
    chat_group_title_invalid: 'El nombre del grupo debe tener entre 2 y 150 caracteres.',
    chat_group_participants_required: 'Selecciona al menos una amistad para crear el grupo.',
    chat_group_participants_invalid: 'La selección de participantes no es válida.',
    chat_group_participants_limit: 'El grupo admite un máximo de 50 participantes activos.',
    chat_group_participant_not_eligible: 'Esa persona ya no está disponible para este grupo. Se actualizarán los candidatos.',
    chat_group_member_not_found: 'La persona ya no pertenece al grupo.',
    chat_group_last_admin: 'Antes debes convertir a otra persona en administradora del grupo.',
    chat_preferences_version_required: 'No se pueden guardar estas preferencias sin su versión actual.',
    chat_preferences_conflict: 'Tus preferencias de chat cambiaron en otro dispositivo. Se actualizarán antes de guardar.',
    chat_preferences_invalid: 'Las preferencias de chat flotante no son válidas.',
    chat_preferences_geometry_invalid: 'La posición o el tamaño de la ventana no son válidos.',
    chat_float_windows_limit: 'Puedes conservar un máximo de cinco conversaciones flotantes.'
};

export function getApiErrorCode(error: unknown): string | null {
    if (!error)
        return null;

    if (error instanceof HttpErrorResponse)
        return getApiErrorCode(error.error);

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;
        const raw = apiError['raw'];

        if (raw && raw !== error) {
            const rawCode = getApiErrorCode(raw);
            if (rawCode)
                return rawCode;
        }
        const code = apiError['code'];

        if (typeof code === 'string' && code.trim())
            return code;
    }

    return null;
}

export const connectionErrorMessage = 'No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';

/**
 * Texto para el usuario de una respuesta de la API (docs/backend/api/ERRORES.md):
 * el backend garantiza que `error` es una frase final en español. `debug`,
 * `code`, `field` y `details` nunca se muestran.
 */
/** Bloqueo por normas pendientes: lo explica el aviso de normas, no un error. */
export function isPolicyAcceptanceBlock(error: unknown): boolean {
    const code = getApiErrorCode(error);
    return code === 'usage_policy_acceptance_required' || code === 'creation_policy_acceptance_required'
        || code === 'platform_rules_acceptance_required';
}

const restrictionScopeLabels: Record<string, string> = {
    creacion: 'la creación de contenido',
    comunidad: 'la comunidad',
    chat: 'el chat',
    publicacion: 'publicar en la comunidad'
};

/**
 * «Tu cuenta de Yosiftware tiene limitada la comunidad hasta el 2 de noviembre de 2026 a las 18:30.» Lo limitado por
 * la moderación de la plataforma (`restricciones` de la sesión o `details` del 403), en la hora de la persona.
 */
export function describePlatformRestriction(scopes: readonly string[], until: string | null | undefined): string | null {
    // `comunidad` ya incluye el chat y publicar: no se repiten.
    const known = scopes.filter(scope => scope in restrictionScopeLabels);
    const visible = known.includes('comunidad') ? known.filter(scope => scope !== 'chat' && scope !== 'publicacion') : known;
    if (!scopes.length) return null;
    const labels = visible.length ? visible.map(scope => restrictionScopeLabels[scope]) : ['esta acción'];
    const what = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}` : labels[0];
    // «limitada la comunidad», «limitado el chat»: concuerda con lo primero que se nombra.
    const limited = what.startsWith('el ') ? 'limitado' : 'limitada';
    const date = until ? new Date(until) : null;
    if (!date || Number.isNaN(date.getTime()))
        return `Tu cuenta de Yosiftware tiene ${limited} ${what} sin fecha de fin.`;
    const day = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `Tu cuenta de Yosiftware tiene ${limited} ${what} hasta el ${day} a las ${time}.`;
}

/** `403 platform_restriction_active` (ADHESION_YOSIFTWARE.md): qué y hasta cuándo. `null` si el error es otro. */
export function getPlatformRestrictionMessage(error: unknown): string | null {
    if (getApiErrorCode(error) !== 'platform_restriction_active') return null;
    const details = getErrorDetails(error);
    const scope = typeof details?.['Alcance'] === 'string' ? details['Alcance'] : '';
    const until = typeof details?.['Hasta'] === 'string' ? details['Hasta'] : null;
    return describePlatformRestriction([scope], until);
}

function getErrorDetails(error: unknown): Record<string, unknown> | null {
    if (error instanceof HttpErrorResponse)
        return getErrorDetails(error.error);
    if (!error || typeof error !== 'object')
        return null;
    const details = (error as Record<string, unknown>)['details'];
    return details && typeof details === 'object' ? details as Record<string, unknown> : null;
}

export function getBackendErrorText(error: unknown): string | null {
    if (error instanceof HttpErrorResponse)
        return getBackendErrorText(error.error);
    if (!error || typeof error !== 'object')
        return null;
    const body = error as Record<string, unknown>;
    const text = body['error'];
    if (typeof text === 'string' && text.trim())
        return text;
    const raw = body['raw'];
    return raw && raw !== error ? getBackendErrorText(raw) : null;
}

export function getApiErrorMessage(error: unknown, fallback: string = 'Error desconocido'): string {
    if (!error)
        return fallback;

    const restriction = getPlatformRestrictionMessage(error);
    if (restriction)
        return restriction;

    const backendText = getBackendErrorText(error);
    if (backendText)
        return backendText;

    // El `message` de HttpErrorResponse es técnico («Http failure response for…»):
    // sin cuerpo válido se usa el texto de la pantalla o un aviso de conexión.
    if (error instanceof HttpErrorResponse)
        return error.status === 0 ? connectionErrorMessage : fallback;

    if (typeof error === 'string')
        return error || fallback;

    // Errores propios de la app: sus textos ya están escritos para el usuario.
    if (error instanceof Error)
        return error.message || fallback;

    if (Array.isArray(error))
        return error.map(item => getApiErrorMessage(item, '')).filter(Boolean).join('\n') || fallback;

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;
        const nested = apiError['error'];
        if (nested && typeof nested === 'object')
            return getApiErrorMessage(nested, fallback);

        for (const key of ['message', 'detail', 'title']) {
            const value = apiError[key];
            if (typeof value === 'string' && value.trim())
                return value;
        }

        const messages = apiError['messages'];
        if (Array.isArray(messages)) {
            const message = messages.map(item => getApiErrorMessage(item, '')).filter(Boolean).join('\n');
            if (message)
                return message;
        }
    }

    return fallback;
}

/**
 * Igual que getApiErrorMessage, pero con textos propios para los códigos de estado
 * de producto cuando el error no trae ya su frase del backend (p. ej. tiempo real).
 */
export function getProductStateMessage(error: unknown, fallback: string = 'Esta acción no está disponible actualmente.'): string {
    const backendText = getBackendErrorText(error);
    if (backendText)
        return backendText;
    const code = getApiErrorCode(error);
    return (code && productStateMessages[code]) || getApiErrorMessage(error, fallback);
}
