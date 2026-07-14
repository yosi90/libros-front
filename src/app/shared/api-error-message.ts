import { HttpErrorResponse } from '@angular/common/http';

const productStateMessages: Record<string, string> = {
    invalid_token: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
    user_not_found: 'Tu sesión ya no está disponible. Inicia sesión de nuevo.',
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

export function getApiErrorMessage(error: unknown, fallback: string = 'Error desconocido'): string {
    if (!error)
        return fallback;

    if (typeof error === 'string')
        return error || fallback;

    if (error instanceof Error)
        return error.message || fallback;

    if (error instanceof HttpErrorResponse)
        return getApiErrorMessage(error.error, error.message || fallback);

    if (Array.isArray(error))
        return error.map(item => getApiErrorMessage(item, '')).filter(Boolean).join('\n') || fallback;

    if (typeof error === 'object') {
        const apiError = error as Record<string, unknown>;

        for (const key of ['message', 'detail', 'error', 'title']) {
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

export function getProductStateMessage(error: unknown, fallback: string = 'Esta acción no está disponible actualmente.'): string {
    const code = getApiErrorCode(error);
    return (code && productStateMessages[code]) || getApiErrorMessage(error, fallback);
}
