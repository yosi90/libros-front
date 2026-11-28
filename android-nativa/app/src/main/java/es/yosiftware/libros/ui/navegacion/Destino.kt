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
    seccion: Destino? = null,
) {
    Biblioteca("Biblioteca", "Mi biblioteca", Iconos.localLibrary),
    Catalogo("Catálogo", "Catálogo", Iconos.travelExplore),
    Comunidad("Comunidad", "Comunidad", Iconos.forum),
    Perfil("Perfil", "Perfil", Iconos.person),
    Estadisticas("Estadísticas", "Estadísticas", Iconos.barChart),
    Preferencias("Preferencias", "Preferencias", Iconos.settings),
    // «Cuenta y seguridad» se retira con la adhesión: la entrada de la hoja «Más» abre el panel de cuentas (hito 6), no
    // una pantalla, y lo de la seguridad está en la web social. Con el carné, que se entiende mejor que el escudo sin
    // texto (ronda 1 de interfaz).
    Cuenta("Cuenta", "Cuenta", Iconos.badge),
    // Con su propio icono: en la hoja «Más» va sin texto y no puede compartir el de Comunidad.
    Mensajes("Mensajes", "Comunidad", Iconos.chat, seccion = Comunidad),
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
