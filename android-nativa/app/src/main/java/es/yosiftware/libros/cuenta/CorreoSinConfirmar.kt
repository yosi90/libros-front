package es.yosiftware.libros.cuenta

import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.leerFecha

/**
 * El correo sin confirmar (kit 1.80, librería 1.9.0; `ecosistema-kit/APK.md`, «La librería 1.9.0»): la cuenta creada
 * con correo entra sin confirmarlo, la plataforma pide recordarlo (`ConSesion.recordarCorreo`) y, a los 7 días sin
 * confirmarlo, la borra. Hasta entonces lo social de la plataforma (el chat, los clubes) responde
 * `403 correo_sin_confirmar`: [ClientePlataforma][es.yosiftware.libros.datos.red.ClientePlataforma] lo avisa con
 * [pedir] y la app abre la hoja del código. Lo social propio de Libros (publicar una reseña, denunciarla) se limita
 * igual antes de llamar a la API ([exigirConfirmado]).
 */
object CorreoSinConfirmar {
    const val CODIGO = "correo_sin_confirmar"
    const val TITULO = "Confirma tu correo"
    const val SOCIAL = "Hasta que lo confirmes no puedes usar el chat, los clubes ni publicar reseñas."
    const val ENVIAR_OTRO = "Enviar otro código"
    const val AHORA_NO = "Ahora no"
    const val OTRO_ENVIADO = "Te hemos enviado otro código."

    private val zona: ZoneId = ZoneId.of("Europe/Madrid")
    private val diaYMes = DateTimeFormatter.ofPattern("d 'de' MMMM", Locale.forLanguageTag("es-ES"))

    /** Si el error de la plataforma es el de lo social con el correo sin confirmar (403; con otro estado es otra cosa). */
    fun loPide(codigo: String?, estadoHttp: Int?): Boolean = codigo == CODIGO && estadoHttp == 403

    fun explicacion(correo: String?): String =
        "Escribe el código de 6 cifras que te hemos enviado" + (correo?.takeIf { it.isNotBlank() }?.let { " a $it" } ?: "") + "."

    /** Hasta cuándo hay para confirmarlo ([antesDe], ISO 8601) y que, si no, la cuenta se borra. */
    fun plazo(antesDe: String?, hoy: LocalDate = LocalDate.now(zona)): String {
        val dia = leerFecha(antesDe, zona)?.toLocalDate() ?: return "Si no lo confirmas a tiempo, tu cuenta se borrará."
        val fecha = dia.format(diaYMes)
        return when (val quedan = ChronoUnit.DAYS.between(hoy, dia)) {
            in Long.MIN_VALUE..0L -> "Hoy es el último día para confirmarlo, o tu cuenta se borrará."
            1L -> "Tienes hasta mañana, $fecha, o tu cuenta se borrará."
            else -> "Tienes hasta el $fecha (quedan $quedan días), o tu cuenta se borrará."
        }
    }

    /** Lo pone [es.yosiftware.libros.datos.Datos] con la sesión: si la cuenta activa tiene el correo sin confirmar. */
    @Volatile
    var sinConfirmar: () -> Boolean = { false }

    const val TEXTO_DEL_ERROR = "Confirma tu correo para publicar reseñas o denunciarlas."

    /**
     * Lo social propio de Libros (publicar una reseña, denunciar una) con el correo sin confirmar: abre la hoja del
     * código y no llama a la API.
     */
    fun exigirConfirmado() {
        if (!sinConfirmar()) return
        pedir()
        throw ErrorDeLibros(CODIGO, TEXTO_DEL_ERROR, estadoHttp = 403)
    }

    private val pedidos = MutableSharedFlow<Unit>(extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    /** Lo social ha respondido `correo_sin_confirmar`: la app abre la hoja del código. */
    val pedido: SharedFlow<Unit> = pedidos.asSharedFlow()

    fun pedir() {
        pedidos.tryEmit(Unit)
    }
}
