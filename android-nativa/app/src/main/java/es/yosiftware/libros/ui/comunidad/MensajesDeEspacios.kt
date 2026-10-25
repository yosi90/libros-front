package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.ErrorDeLibros

/**
 * Los textos de los errores de los espacios (`SPACE_ERROR_MESSAGES` y `spaceErrorMessage` de `shared/club-spaces.ts`):
 * primero la tabla por `code` y, si no está, el texto de la pantalla. Al revés que los de Libros
 * ([ErrorDeLibros.mensajeO], que prefiere la frase del servidor): así lo hace la web.
 */
object MensajesDeEspacios {
    const val DOS_PASOS = "dos_pasos_necesarios"
    const val CORREO_DE_OTRA_CUENTA = "correo_de_otra_cuenta"
    const val YA_ES_MIEMBRO = "ya_es_miembro"
    const val SOLICITUD_NO_ENCONTRADA = "solicitud_no_encontrada"

    /** La vista de la web social donde se activa la verificación en dos pasos. */
    const val VISTA_DE_SEGURIDAD = "seguridad"

    private val textos = mapOf(
        "expulsado_del_espacio" to "Te sacaron de este club: solo puedes volver con una invitación.",
        "espacio_no_abierto" to "Este club ya no admite entrar sin más: pide entrar o espera una invitación.",
        "espacio_sin_solicitudes" to "Este club solo admite invitaciones.",
        "espacio_lleno" to "El club está lleno (2000 miembros).",
        DOS_PASOS to "Este club exige la verificación en dos pasos. Actívala en tu cuenta de Yosiftware y vuelve a intentarlo.",
        YA_ES_MIEMBRO to "Ya eres miembro de este club.",
        "propietario_no_puede_salir" to "Quien tiene la propiedad del club no puede salir: traspásalo antes.",
        CORREO_DE_OTRA_CUENTA to "La invitación es para un correo que esta cuenta no tiene confirmado. Entra con la cuenta de ese correo.",
        "acepta_en_la_web" to "Esta invitación se acepta desde la web de su espacio.",
        "invitacion_no_encontrada" to "Esta invitación ya no vale: caducó, la retiraron o ya se usó.",
        SOLICITUD_NO_ENCONTRADA to "Esa solicitud ya no está pendiente.",
        "persona_no_encontrada" to "No hemos encontrado a esa persona.",
        "correo_no_valido" to "Escribe un correo válido.",
        "invitacion_no_valida" to "La invitación no es válida.",
        "demasiadas_invitaciones" to "Se han enviado demasiadas invitaciones. Prueba más tarde.",
        "demasiadas_peticiones" to "Demasiadas peticiones seguidas. Espera un momento.",
        "sin_permiso_en_el_espacio" to "Tu papel en el club no te deja hacer esto.",
        "espacio_no_encontrado" to "Este club ya no está disponible para tu cuenta.",
        "busqueda_no_valida" to "Escribe entre 2 y 60 caracteres para buscar.",
        ErrorDeLibros.SIN_SESION to "Entra con tu cuenta de Yosiftware.",
    )

    fun de(error: ErrorDeLibros, porDefecto: String): String = textos[error.codigo] ?: porDefecto

    /** Lo de entrar o salir (`spaceErrorMessage(error, getProductStateMessage(error, …))`). */
    fun deEspacioOProducto(error: ErrorDeLibros, porDefecto: String): String = textos[error.codigo] ?: error.mensajeO(porDefecto)
}
