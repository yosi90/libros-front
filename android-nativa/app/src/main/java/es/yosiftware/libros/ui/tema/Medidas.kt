package es.yosiftware.libros.ui.tema

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.dropShadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.shadow.Shadow
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp

/** Los radios de `_tokens.sass` (--mobile-radius-*). El de 999px de los botones y chips es [pildora]. */
object Radios {
    val xs = 8.dp
    val sm = 12.dp
    val md = 18.dp
    val lg = 26.dp
    val xl = 32.dp
    val pildora = RoundedCornerShape(percent = 50)
}

/** Los espaciados de `_tokens.sass` (--mobile-space-1 a 8). */
object Espacios {
    val e1 = 4.dp
    val e2 = 8.dp
    val e3 = 12.dp
    val e4 = 16.dp
    val e5 = 20.dp
    val e6 = 24.dp
    val e7 = 32.dp
    val e8 = 40.dp
}

/** Las alturas y anchos fijos de `_tokens.sass` y el mínimo táctil de docs/GUIA_ESTILOS.md (Mobile). */
object Alturas {
    val barraSuperior = 64.dp // --mobile-appbar-height
    val navegacionInferior = 72.dp // --mobile-bottom-nav-height
    val anchoRail = 88.dp // --mobile-rail-width
    val contenidoMaximo = 1120.dp // --mobile-content-max
    val tactilMinimo = 44.dp
    val botonDeIcono = 48.dp // .m-icon-button
    val islaDelLector = 56.dp // .native-reader-island
}

/** Movimiento de 160 a 240 ms (docs/GUIA_ESTILOS.md, Mobile), con las curvas que usa el Sass. */
object Movimiento {
    const val corto = 160
    const val medio = 200
    const val largo = 240
    /** cubic-bezier(.2, .8, .2, 1): entradas (la hoja «Más», el interruptor del tema). */
    val entrada = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f)
    /** cubic-bezier(.4, 0, 1, 1): salidas (cerrar la hoja «Más»). */
    val salida = CubicBezierEasing(0.4f, 0f, 1f, 1f)
    /** `ease` de CSS. */
    val ease = CubicBezierEasing(0.25f, 0.1f, 0.25f, 1f)
    /** `ease-out` de CSS. */
    val easeOut = CubicBezierEasing(0f, 0f, 0.58f, 1f)
}

/**
 * --mobile-shadow-1: `0 1px 2px rgba(24, 33, 30, .08), 0 2px 8px rgba(24, 33, 30, .05)` en claro y
 * `0 1px 2px rgba(0, 0, 0, .28), 0 2px 8px rgba(0, 0, 0, .18)` en oscuro. La sombra de Compose usa el desenfoque de CSS.
 */
fun Modifier.sombra1(forma: Shape, colores: Colores): Modifier {
    val base = if (colores.oscuro) Color.Black else Color(red = 24, green = 33, blue = 30)
    val (a, b) = if (colores.oscuro) 0.28f to 0.18f else 0.08f to 0.05f
    return this
        .dropShadow(forma, Shadow(radius = 2.dp, color = base.copy(alpha = a), offset = DpOffset(0.dp, 1.dp)))
        .dropShadow(forma, Shadow(radius = 8.dp, color = base.copy(alpha = b), offset = DpOffset(0.dp, 2.dp)))
}

/** --mobile-shadow-2: `0 8px 28px rgba(24, 33, 30, .12)` en claro y `rgba(0, 0, 0, .34)` en oscuro. */
fun Modifier.sombra2(forma: Shape, colores: Colores): Modifier {
    val color = if (colores.oscuro) Color.Black.copy(alpha = 0.34f) else Color(red = 24, green = 33, blue = 30).copy(alpha = 0.12f)
    return dropShadow(forma, Shadow(radius = 28.dp, color = color, offset = DpOffset(0.dp, 8.dp)))
}

/** La de `.m-sheet`: `0 -10px 36px rgba(24, 33, 30, .16)`, igual en los dos temas. */
fun Modifier.sombraDeHoja(forma: Shape): Modifier =
    dropShadow(forma, Shadow(radius = 36.dp, color = Color(red = 24, green = 33, blue = 30).copy(alpha = 0.16f), offset = DpOffset(0.dp, (-10).dp)))
