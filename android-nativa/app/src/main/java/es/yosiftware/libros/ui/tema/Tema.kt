package es.yosiftware.libros.ui.tema

import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.LocalActivity
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.text.selection.LocalTextSelectionColors
import androidx.compose.foundation.text.selection.TextSelectionColors
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect

/**
 * El tema de la presentación Mobile. Material 3 solo pone la infraestructura (ondas al tocar, selección, accesibilidad):
 * el aspecto sale de [Colores], [Textos] y las medidas, como en la APK de Capacitor (docs/GUIA_ESTILOS.md, Mobile).
 *
 * TODO(clon): la respuesta al toque. La WebView no tiene onda, sino el resaltado de toque del navegador y los `:active`
 * de cada primitiva (src/assets/css/mobile/_primitives.sass); aquí queda la onda de Material con el color del texto.
 */
@Composable
fun TemaLibros(tema: TemaMobile, contenido: @Composable () -> Unit) {
    val colores = if (tema == TemaMobile.Oscuro) ColoresOscuros else ColoresClaros
    BarrasDelSistema(colores)
    val esquema = (if (colores.oscuro) darkColorScheme() else lightColorScheme()).copy(
        primary = colores.primario, onPrimary = colores.sobrePrimario,
        primaryContainer = colores.contenedorPrimario, onPrimaryContainer = colores.sobreContenedorPrimario,
        secondary = colores.secundario, secondaryContainer = colores.contenedorSecundario, tertiary = colores.terciario,
        background = colores.lienzo, onBackground = colores.tinta,
        surface = colores.superficie, onSurface = colores.tinta, onSurfaceVariant = colores.tintaSuave,
        surfaceContainer = colores.superficieContenedor, surfaceContainerHigh = colores.superficieAlta,
        outline = colores.contornoFuerte, outlineVariant = colores.contorno, scrim = colores.velo,
        error = colores.error, errorContainer = colores.contenedorError,
    )
    MaterialTheme(colorScheme = esquema) {
        CompositionLocalProvider(
            LocalColores provides colores,
            LocalContentColor provides colores.tinta,
            LocalTextStyle provides Textos.cuerpo,
            LocalTextSelectionColors provides TextSelectionColors(colores.primario, mezclar(colores.primario, 0.32f)),
            content = contenido,
        )
    }
}

/**
 * La barra de estado con el color del tema, como `applyNativeStatusBar` (#f5f2ea u #111916, con los iconos oscuros o
 * claros). Como la WebView de Capacitor 8, la app va de borde a borde: la barra es transparente y debajo se ve lo que
 * pinta la app, que es el lienzo (o la app bar sobre él), salvo el rail, que en `native-mobile` llega hasta arriba.
 */
@Composable
private fun BarrasDelSistema(colores: Colores) {
    val actividad = LocalActivity.current as? ComponentActivity ?: return
    LaunchedEffect(actividad, colores.oscuro) {
        val transparente = android.graphics.Color.TRANSPARENT
        val estilo = if (colores.oscuro) SystemBarStyle.dark(transparente) else SystemBarStyle.light(transparente, transparente)
        actividad.enableEdgeToEdge(estilo, estilo)
    }
}
