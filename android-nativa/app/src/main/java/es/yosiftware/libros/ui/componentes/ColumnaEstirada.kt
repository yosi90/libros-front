package es.yosiftware.libros.ui.componentes

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Una columna que se comporta como una rejilla de CSS (`display: grid` con filas `auto` y el `align-content` por
 * defecto): si le sobra alto (porque quien la contiene le da un mínimo mayor que su contenido), lo reparte a partes
 * iguales entre sus filas, y cada fila ocupa su parte entera. Así se estiran los formularios a pantalla completa de
 * la APK de Capacitor (el editor de estado): los botones crecen, el área de texto crece y lo de una fila queda
 * centrado si su Sass lo centra. Las filas que quieran repartir lo suyo por dentro usan otra [ColumnaEstirada].
 */
@Composable
fun ColumnaEstirada(modifier: Modifier = Modifier, espacio: Dp = 0.dp, contenido: @Composable () -> Unit) {
    Layout(contenido, modifier) { filas, restricciones ->
        val hueco = espacio.roundToPx()
        val ancho = restricciones.maxWidth
        val naturales = filas.map { it.minIntrinsicHeight(ancho) }
        val ocupado = naturales.sum() + hueco * (filas.size - 1).coerceAtLeast(0)
        val sobra = (restricciones.minHeight - ocupado).coerceAtLeast(0)
        val parte = if (filas.isEmpty()) 0 else sobra / filas.size
        val resto = if (filas.isEmpty()) 0 else sobra % filas.size
        val colocables = filas.mapIndexed { i, fila ->
            val alto = naturales[i] + parte + if (i < resto) 1 else 0
            fila.measure(Constraints(minWidth = ancho, maxWidth = ancho, minHeight = alto, maxHeight = alto))
        }
        val total = colocables.sumOf { it.height } + hueco * (colocables.size - 1).coerceAtLeast(0)
        layout(ancho, total.coerceIn(restricciones.minHeight, restricciones.maxHeight)) {
            var y = 0
            colocables.forEach { colocable ->
                colocable.placeRelative(0, y)
                y += colocable.height + hueco
            }
        }
    }
}
