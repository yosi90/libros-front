package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.ErrorDeLibros

/**
 * Los errores de los espacios de la plataforma. Desde el kit 1.83 la frase es la de la plataforma, tal cual: el backend
 * de Libros declara que sus espacios se llaman «clubes» (`ecosistema-kit/ESPACIOS.md`, «Cómo los llamas») y los errores
 * ya llegan así («Este club ya tiene 2000 miembros»). La tabla de frases que copiaba `SPACE_ERROR_MESSAGES` de la web se
 * retiró: por el `code` solo se decide qué hacer (abrir la seguridad con [DOS_PASOS], cambiar de cuenta con
 * [CORREO_DE_OTRA_CUENTA]…), no qué frase poner.
 */
object MensajesDeEspacios {
    const val DOS_PASOS = "dos_pasos_necesarios"
    const val CORREO_DE_OTRA_CUENTA = "correo_de_otra_cuenta"
    const val YA_ES_MIEMBRO = "ya_es_miembro"
    const val SOLICITUD_NO_ENCONTRADA = "solicitud_no_encontrada"
    const val INVITACION_NO_ENCONTRADA = "invitacion_no_encontrada"

    /** La vista de la web social donde se activa la verificación en dos pasos. */
    const val VISTA_DE_SEGURIDAD = "seguridad"

    /** Sin sesión no es un error de la plataforma, sino de Libros (o de la librería, sin cuenta): su texto es este. */
    const val SIN_SESION = "Entra con tu cuenta de Yosiftware."

    /** La frase de la plataforma; si no llegó ninguna (sin conexión, una respuesta rara), la de la pantalla. */
    fun de(error: ErrorDeLibros, porDefecto: String): String =
        if (error.codigo == ErrorDeLibros.SIN_SESION) SIN_SESION else error.mensajeO(porDefecto)
}
