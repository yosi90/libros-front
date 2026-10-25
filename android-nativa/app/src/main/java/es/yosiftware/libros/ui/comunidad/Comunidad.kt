package es.yosiftware.libros.ui.comunidad

import androidx.annotation.DrawableRes
import es.yosiftware.libros.datos.modelos.InvitacionRecibida
import es.yosiftware.libros.datos.modelos.ResumenDeComunidad
import es.yosiftware.libros.datos.modelos.ResumenSocial
import es.yosiftware.libros.ui.tema.Iconos

/**
 * Las secciones propias de la pestaña Comunidad (`SocialShellComponent.items`). Mensajes es el chat de la plataforma
 * (hito 12): abre su destino.
 */
enum class SeccionDeComunidad(val etiqueta: String, @param:DrawableRes val icono: Int) {
    RESUMEN("Resumen", Iconos.dashboard),
    CLUBES("Clubes", Iconos.groups3),
    MENSAJES("Mensajes", Iconos.forum),
}

/** Lo social que se fue a la plataforma (`externalItems`): se abre en la web social, con el símbolo delante. */
enum class EnlaceSocial(val etiqueta: String, @param:DrawableRes val icono: Int, val vista: String) {
    PERSONAS("Personas", Iconos.diversity3, "personas"),
    AMISTADES("Amistades", Iconos.group, "amistades"),
    BLOQUEOS("Bloqueos", Iconos.block, "bloqueos"),
}

/** Adónde lleva una tarjeta del resumen. */
sealed interface DestinoDeTarjeta {
    /** Una vista de la web social, en el navegador. */
    data class WebSocial(val vista: String) : DestinoDeTarjeta
    data class Clubes(val pestana: PestanaDeClubes) : DestinoDeTarjeta
}

/** Una tarjeta del resumen (`SocialSummaryComponent.cards`); [resaltada] si hay algo pendiente. */
data class TarjetaDeResumen(val etiqueta: String, val valor: Int, @param:DrawableRes val icono: Int, val destino: DestinoDeTarjeta, val resaltada: Boolean = false) {
    val externa: Boolean get() = destino is DestinoDeTarjeta.WebSocial
}

/** Lo que el resumen calcula sin pantalla (`social-summary.component.ts`). */
object ResumenSocialDeComunidad {
    const val ERROR = "No se ha podido cargar el resumen social."

    /** Solo las invitaciones a espacios de clubes cuentan. */
    fun invitacionesAClubes(invitaciones: List<InvitacionRecibida>): Int = invitaciones.count { it.clubId != null }

    /**
     * Las tarjetas, en su orden: las cuatro de la plataforma si llegó su resumen; «Clubes activos» si llegó el de Libros;
     * «Invitaciones a clubes» si llegaron. «Mensajes sin leer» llega con el chat (hito 12).
     *
     * Distinto de la web, a propósito: «Invitaciones a clubes» lleva al centro de acceso, a las recibidas, y no a
     * Descubrir, donde no se ven.
     */
    fun tarjetas(social: ResumenSocial?, comunidad: ResumenDeComunidad?, invitaciones: Int?): List<TarjetaDeResumen> = buildList {
        if (social != null) {
            add(TarjetaDeResumen("Amistades", social.amistades, Iconos.group, DestinoDeTarjeta.WebSocial("amistades")))
            add(TarjetaDeResumen("Solicitudes de amistad", social.solicitudesRecibidas, Iconos.personAdd, DestinoDeTarjeta.WebSocial("solicitudes"), social.solicitudesRecibidas > 0))
            add(TarjetaDeResumen("Seguidores", social.seguidores, Iconos.diversity3, DestinoDeTarjeta.WebSocial("seguidores")))
            add(TarjetaDeResumen("Siguiendo", social.seguidos, Iconos.personSearch, DestinoDeTarjeta.WebSocial("seguidos")))
        }
        if (comunidad != null) add(TarjetaDeResumen("Clubes activos", comunidad.activos ?: 0, Iconos.groups3, DestinoDeTarjeta.Clubes(PestanaDeClubes.DESCUBRIR)))
        if (invitaciones != null) {
            add(TarjetaDeResumen("Invitaciones a clubes", invitaciones, Iconos.markEmailUnread, DestinoDeTarjeta.Clubes(PestanaDeClubes.ACCESO), invitaciones > 0))
        }
    }

    /** Falta alguna parte: un aviso arriba, y el resto se enseña. */
    fun parcial(social: ResumenSocial?, comunidad: ResumenDeComunidad?, invitaciones: Int?): Boolean =
        social == null || comunidad == null || invitaciones == null || comunidad.parcial
}
