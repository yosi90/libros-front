package es.yosiftware.libros.ui.tema

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Las dos familias de `_tokens.sass`. La APK de Capacitor no carga Inter ni Iowan/Palatino: el cuerpo cae a Roboto
 * (la sans del sistema) y los títulos, al serif del sistema. Se clona lo que se ve, no lo que pide el Sass.
 */
object Fuentes {
    val cuerpo: FontFamily = FontFamily.Default // --mobile-font-body
    val display: FontFamily = FontFamily.Serif // --mobile-font-display
}

/** El `line-height` de CSS reparte el interlineado a partes iguales arriba y abajo del texto. */
private val comoCss = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None)

/** 1rem son 16 px, que en la WebView de la APK son 16 dp; aquí, sp, para respetar el tamaño de letra del sistema. */
private fun rem(valor: Double) = (valor * 16).sp

/**
 * Los textos de `_primitives.sass` y de los componentes Mobile, con sus tamaños, pesos, interlineados y espaciados. El
 * color va aparte (en cada componente), como en el Sass.
 */
object Textos {
    /** El `body` de la presentación Mobile: 1rem, con el interlineado 1.5 de Bootstrap. */
    val cuerpo = TextStyle(fontFamily = Fuentes.cuerpo, fontSize = rem(1.0), lineHeight = 1.5.em, lineHeightStyle = comoCss)

    /** .m-eyebrow: .72rem, 800, .14em, interlineado 1.2 y en mayúsculas (el texto se pasa con `uppercase()`). */
    val eyebrow = cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.14.em, lineHeight = 1.2.em)

    /** .m-supporting: .94rem e interlineado 1.55. */
    val apoyo = cuerpo.copy(fontSize = rem(0.94), lineHeight = 1.55.em)

    /** .m-button: `700 .9rem/1`. */
    val boton = cuerpo.copy(fontSize = rem(0.9), fontWeight = FontWeight.Bold, lineHeight = 1.em)

    /** .m-chip: .78rem y 700. */
    val chip = cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.Bold)

    /** .m-list-item__body strong: el cuerpo en negrita (`strong`). */
    val filaPrincipal = cuerpo.copy(fontWeight = FontWeight.Bold)

    /** .m-list-item__body span: .8rem. */
    val filaSecundaria = cuerpo.copy(fontSize = rem(0.8))

    /** .m-auth-link: .8rem y 800. */
    val enlace = cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.ExtraBold)

    /** La etiqueta de la navegación inferior y del rail: `700 .68rem/1.2`. */
    val etiquetaDeNavegacion = cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.Bold, lineHeight = 1.2.em)

    /** .m-appbar__identity span: .64rem, 800, .12em y en mayúsculas. */
    val eyebrowDeBarra = cuerpo.copy(fontSize = rem(0.64), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.12.em)

    /** .m-appbar__identity strong: display, 1.08rem y 600. */
    val tituloDeBarra = cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.08), fontWeight = FontWeight.SemiBold)

    /**
     * .m-title: `clamp(1.45rem, 5vw, 2rem)`, 600 e interlineado 1.08. Depende del ancho de la ventana, en dp, como el
     * `vw` de la WebView.
     */
    fun titulo(anchoDp: Float) = cuerpo.copy(
        fontFamily = Fuentes.display,
        fontSize = (anchoDp * 0.05f).coerceIn(1.45f * 16, 2f * 16).sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 1.08.em,
    )

    /** .m-display: `clamp(2rem, 8vw, 3.75rem)`, 600, interlineado .98 y espaciado -.035em. */
    fun display(anchoDp: Float) = cuerpo.copy(
        fontFamily = Fuentes.display,
        fontSize = (anchoDp * 0.08f).coerceIn(2f * 16, 3.75f * 16).sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 0.98.em,
        letterSpacing = (-0.035).em,
    )
}
