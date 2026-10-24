package es.yosiftware.libros.ui.componentes

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos

/** .m-eyebrow: la línea pequeña en mayúsculas sobre un título, con su margen de 8 dp debajo. */
@Composable
fun TextoEyebrow(texto: String, modifier: Modifier = Modifier) {
    Text(
        texto.uppercase(),
        modifier.padding(bottom = Espacios.e2),
        color = LocalColores.current.primario,
        style = Textos.eyebrow,
    )
}

/** .m-title: el título de una pantalla o de un bloque, que crece con el ancho de la ventana. */
@Composable
fun TextoTitulo(texto: String, modifier: Modifier = Modifier, maxLineas: Int = Int.MAX_VALUE) {
    Text(
        texto,
        modifier.semantics { heading() },
        color = LocalColores.current.tinta,
        style = Textos.titulo(LocalVentana.current.anchoDp),
        maxLines = maxLineas,
        overflow = TextOverflow.Ellipsis,
    )
}

/** .m-display: el titular grande de una portada. */
@Composable
fun TextoDisplay(texto: String, modifier: Modifier = Modifier) {
    Text(
        texto,
        modifier.semantics { heading() },
        color = LocalColores.current.tinta,
        style = Textos.display(LocalVentana.current.anchoDp),
    )
}

/**
 * .m-supporting: el texto de apoyo, con un ancho máximo de 58ch. El `ch` es el ancho del «0» de su letra: en Roboto,
 * 0,5615 veces el tamaño (unos 490 dp con la letra normal), y crece con el tamaño de letra del sistema.
 */
@Composable
fun TextoDeApoyo(texto: String, modifier: Modifier = Modifier) {
    val anchoMaximo = with(LocalDensity.current) { (Textos.apoyo.fontSize.value * 0.5615f * 58).sp.toDp() }
    Text(
        texto,
        modifier.widthIn(max = anchoMaximo),
        color = LocalColores.current.tintaSuave,
        style = Textos.apoyo,
    )
}
