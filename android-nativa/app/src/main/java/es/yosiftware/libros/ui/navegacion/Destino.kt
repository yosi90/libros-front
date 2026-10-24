package es.yosiftware.libros.ui.navegacion

import androidx.annotation.DrawableRes
import es.yosiftware.libros.ui.tema.Iconos

/**
 * Las pantallas del shell, una por ruta de `/dashboard` de la APK de Capacitor. [titulo] es el de la app bar
 * (`DashboardComponent.pageTitle`) y [seccion], el destino de la navegación que se marca: Mensajes está en
 * `/dashboard/community/messages`, así que marca Comunidad y la app bar dice «Comunidad».
 */
enum class Destino(
    val etiqueta: String,
    val titulo: String,
    @param:DrawableRes val icono: Int,
    /** El hito del roadmap en el que llega su pantalla. */
    val hito: Int,
    seccion: Destino? = null,
) {
    Biblioteca("Biblioteca", "Mi biblioteca", Iconos.localLibrary, hito = 8),
    Catalogo("Catálogo", "Catálogo", Iconos.travelExplore, hito = 8),
    Comunidad("Comunidad", "Comunidad", Iconos.forum, hito = 11),
    Perfil("Perfil", "Perfil", Iconos.person, hito = 11),
    // TODO(clon): en la APK actual, Avisos no es una ruta, sino el panel de la campana (notification-bell y
    // notification-center, src/app/components/shared/common/). Llega con el push central (hito 12).
    Avisos("Avisos", "Avisos", Iconos.notifications, hito = 12),
    Estadisticas("Estadísticas", "Estadísticas", Iconos.barChart, hito = 8),
    Preferencias("Preferencias", "Preferencias", Iconos.settings, hito = 11),
    Cuenta("Cuenta y seguridad", "Cuenta y seguridad", Iconos.shield, hito = 6),
    Mensajes("Mensajes", "Comunidad", Iconos.forum, hito = 12, seccion = Comunidad),
    ;

    /** El destino de la navegación que queda marcado (`routerLinkActive`). */
    val seccion: Destino = seccion ?: this

    companion object {
        /** El primero al entrar: `/dashboard/books`. */
        val inicial = Biblioteca

        /** La barra inferior, en la ventana compacta, sin contar «Más» (`MobileNavigationComponent.items`). */
        val enLaBarra = listOf(Biblioteca, Catalogo, Comunidad)

        /** Las entradas de la hoja «Más», en su orden (`mobile-dashboard-chrome.component.html`). */
        val enLaHojaMas = listOf(Perfil, Cuenta, Preferencias, Estadisticas, Mensajes)
    }
}
