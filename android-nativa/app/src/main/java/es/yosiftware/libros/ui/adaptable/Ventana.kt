package es.yosiftware.libros.ui.adaptable

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.union
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalWindowInfo

/**
 * Los cortes de la app (`AdaptiveLayoutService`, `ADAPTIVE_LAYOUT_QUERIES`): compacta por debajo de 600 dp, media hasta
 * 1050 y expandida desde ahí. No son los de Material: la clase de `currentWindowAdaptiveInfo()` se corta en 600 y 840
 * y no da el ancho, así que se calcula con el ancho exacto de la ventana (`LocalWindowInfo`, como hace por dentro).
 * El Honor Magic V3 plegado es compacta; desplegado mide unos 718 dp, media.
 */
enum class ClaseDeVentana {
    Compacta,
    Media,
    Expandida,
    ;

    /** Media o mayor: rail en vez de barra inferior y sin app bar (dahsboard.component.sass, `native-mobile`). */
    val conRail get() = this != Compacta

    companion object {
        const val CORTE_MEDIA = 600f
        const val FIN_MEDIA = 1050f

        fun de(anchoDp: Float): ClaseDeVentana = when {
            anchoDp < CORTE_MEDIA -> Compacta
            anchoDp <= FIN_MEDIA -> Media
            else -> Expandida
        }
    }
}

/**
 * Cómo es la ventana ahora: su ancho y su alto en dp, su clase y la postura del plegable. El diseño depende de la
 * ventana, nunca del modelo del móvil (ecosistema-kit/APK.md, «Móviles plegables»).
 */
@Immutable
data class Ventana(
    val anchoDp: Float,
    val altoDp: Float,
    val postura: Postura,
) {
    val clase: ClaseDeVentana = ClaseDeVentana.de(anchoDp)
}

/** Para cualquier pantalla, sin pasarla de mano en mano: `LocalVentana.current`. */
val LocalVentana = staticCompositionLocalOf { Ventana(anchoDp = 390f, altoDp = 800f, postura = Postura.Plana) }

@Composable
fun rememberVentana(): Ventana {
    val tamano = LocalWindowInfo.current.containerSize
    val densidad = LocalDensity.current.density
    return Ventana(anchoDp = tamano.width / densidad, altoDp = tamano.height / densidad, postura = rememberPostura())
}

/**
 * El `env(safe-area-inset-*)` de la WebView (`--app-safe-*`): las barras del sistema y el recorte de la cámara, sin el
 * teclado, que va aparte con `imePadding()`.
 */
val WindowInsets.Companion.zonaSegura: WindowInsets
    @Composable get() = WindowInsets.systemBars.union(WindowInsets.displayCutout)
