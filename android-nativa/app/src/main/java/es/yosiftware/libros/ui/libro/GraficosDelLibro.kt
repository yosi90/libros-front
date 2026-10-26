package es.yosiftware.libros.ui.libro

import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// Los gráficos del resumen del libro, dibujados con Canvas en lugar de ApexCharts (book-charts.ts en 5dc3120): las
// barras por capítulo (el ritmo y el reparto), el mapa de presencia y el donut por grupos.
// Los colores salen de los tokens del tema, como la paleta que la web leía de las variables CSS.

/** La anchura mínima de cada capítulo en los gráficos por capítulo: si no caben, se desplazan en horizontal. */
val ColumnaDeCapitulo = 26.dp

private val letraDeEje = TextStyle(fontSize = 11.sp)

/** Una serie de barras: su nombre (para la leyenda), sus valores por capítulo y su color. */
class SerieDeBarras(val nombre: String, val valores: List<Int>, val color: Color)

/**
 * Barras por capítulo (`pacingChart` y `castPerChapterChart`): un eje con su escala y la rejilla discontinua, las
 * barras (apiladas si hay varias series), la media opcional y la leyenda arriba si hay varias series. Se desplaza en
 * horizontal si los capítulos no caben a [ColumnaDeCapitulo] cada uno.
 */
@Composable
fun BarrasPorCapitulo(categorias: List<String>, series: List<SerieDeBarras>, alto: Dp, media: Double? = null, tituloX: String? = null) {
    val colores = LocalColores.current
    val medidor = rememberTextMeasurer()
    Column(Modifier.fillMaxWidth()) {
        if (series.size > 1) Leyenda(series.map { it.nombre to it.color }, cuadrada = true)
        DesplazableSiNoCabe(categorias.size) { ancho ->
            Canvas(Modifier.width(ancho).height(alto)) {
                val sumas = categorias.indices.map { i -> series.sumOf { it.valores.getOrElse(i) { 0 } } }
                val (tope, paso) = ResumenDelLibro.escala(max(sumas.maxOrNull()?.toDouble() ?: 0.0, media ?: 0.0))
                val izquierda = 34.dp.toPx()
                val abajo = (if (tituloX != null) 44.dp else 24.dp).toPx()
                val arriba = 10.dp.toPx()
                val alturaUtil = size.height - abajo - arriba
                val anchoUtil = size.width - izquierda - 8.dp.toPx()
                fun y(valor: Double) = arriba + alturaUtil * (1 - valor / tope).toFloat()
                // La rejilla y las marcas del eje.
                var marca = 0.0
                while (marca <= tope + 0.001) {
                    val linea = y(marca)
                    drawLine(colores.contorno, Offset(izquierda, linea), Offset(size.width - 8.dp.toPx(), linea), 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 3.dp.toPx())))
                    texto(medidor, marca.roundToInt().toString(), letraDeEje.copy(color = colores.tintaSuave), Offset(izquierda - 8.dp.toPx(), linea), derecha = true)
                    marca += paso
                }
                // Las barras: un 60 % del hueco de cada capítulo (un 85 % con más de 30).
                val hueco = anchoUtil / max(1, categorias.size)
                val anchoBarra = hueco * if (categorias.size > 30) 0.85f else 0.6f
                categorias.forEachIndexed { i, categoria ->
                    val x = izquierda + hueco * i + (hueco - anchoBarra) / 2
                    var base = 0.0
                    series.forEachIndexed { s, serie ->
                        val valor = serie.valores.getOrElse(i) { 0 }
                        if (valor > 0) {
                            val superior = s == series.lastIndex || series.drop(s + 1).all { it.valores.getOrElse(i) { 0 } == 0 }
                            barra(serie.color, x, y(base + valor), anchoBarra, y(base) - y(base + valor), if (superior) (if (series.size > 1) 2.dp else 3.dp).toPx() else 0f)
                        }
                        base += valor
                    }
                    texto(medidor, categoria, letraDeEje.copy(color = colores.tintaSuave), Offset(izquierda + hueco * i + hueco / 2, size.height - abajo + 14.dp.toPx()), centrado = true)
                }
                if (tituloX != null) texto(medidor, tituloX, letraDeEje.copy(color = colores.tintaSuave, fontWeight = FontWeight.Medium), Offset(izquierda + anchoUtil / 2, size.height - 12.dp.toPx()), centrado = true)
                // La media: una raya discontinua y su etiqueta a la derecha.
                if (media != null) {
                    val linea = y(media)
                    drawLine(colores.atencion, Offset(izquierda, linea), Offset(izquierda + anchoUtil, linea), 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx())))
                    val etiqueta = medidor.measure("Media ${ResumenDelLibro.decimal(media)}", letraDeEje.copy(color = Color.White))
                    val margen = 4.dp.toPx()
                    val ancho = etiqueta.size.width + margen * 2
                    val esquina = Offset(izquierda + anchoUtil - ancho, linea - etiqueta.size.height / 2f - margen)
                    drawRoundRect(colores.atencion, esquina, Size(ancho, etiqueta.size.height + margen * 2), CornerRadius(2.dp.toPx()))
                    drawText(etiqueta, topLeft = Offset(esquina.x + margen, esquina.y + margen))
                }
            }
        }
    }
}

/**
 * Tu ritmo en este libro (`paceCurveChart`): la página más alta a la que llegaste cada día con lectura, en una línea con
 * su relleno suave, la escala del eje como en las barras y el primer y el último día abajo.
 */
@Composable
fun CurvaDeRitmo(puntos: List<Pair<String, Int>>, alto: Dp) {
    val colores = LocalColores.current
    val medidor = rememberTextMeasurer()
    Canvas(Modifier.fillMaxWidth().height(alto)) {
        if (puntos.isEmpty()) return@Canvas
        val (tope, paso) = ResumenDelLibro.escala(puntos.maxOf { it.second }.toDouble())
        val izquierda = 34.dp.toPx()
        val abajo = 24.dp.toPx()
        val arriba = 10.dp.toPx()
        val derecha = 12.dp.toPx()
        val alturaUtil = size.height - abajo - arriba
        val anchoUtil = size.width - izquierda - derecha
        fun y(valor: Double) = arriba + alturaUtil * (1 - valor / tope).toFloat()
        fun x(i: Int) = izquierda + if (puntos.size == 1) anchoUtil / 2 else anchoUtil * i / (puntos.size - 1)
        var marca = 0.0
        while (marca <= tope + 0.001) {
            val linea = y(marca)
            drawLine(colores.contorno, Offset(izquierda, linea), Offset(size.width - derecha, linea), 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 3.dp.toPx())))
            texto(medidor, marca.roundToInt().toString(), letraDeEje.copy(color = colores.tintaSuave), Offset(izquierda - 8.dp.toPx(), linea), derecha = true)
            marca += paso
        }
        val linea = Path().apply {
            puntos.forEachIndexed { i, (_, pagina) -> if (i == 0) moveTo(x(i), y(pagina.toDouble())) else lineTo(x(i), y(pagina.toDouble())) }
        }
        val relleno = Path().apply {
            addPath(linea)
            lineTo(x(puntos.lastIndex), y(0.0))
            lineTo(x(0), y(0.0))
            close()
        }
        drawPath(relleno, colores.primario.copy(alpha = 0.16f))
        drawPath(linea, colores.primario, style = Stroke(2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        puntos.indices.forEach { i -> drawCircle(colores.primario, 3.dp.toPx(), Offset(x(i), y(puntos[i].second.toDouble()))) }
        val base = size.height - abajo + 14.dp.toPx()
        texto(medidor, ResumenDelLibro.diaCorto(puntos.first().first), letraDeEje.copy(color = colores.tintaSuave), Offset(x(0), base), centrado = puntos.size == 1)
        if (puntos.size > 1) texto(medidor, ResumenDelLibro.diaCorto(puntos.last().first), letraDeEje.copy(color = colores.tintaSuave), Offset(x(puntos.lastIndex), base), derecha = true)
    }
}

/**
 * Quién aparece (`presenceHeatmap`): una fila por personaje y una casilla por capítulo, del color de su presencia, con
 * la leyenda arriba.
 */
@Composable
fun MapaDePresencia(presencia: Presencia) {
    val colores = LocalColores.current
    val medidor = rememberTextMeasurer()
    val niveles = listOf(
        "No sale" to colores.superficieAlta,
        "Solo nombrado" to mezclar(colores.atencion, 0.7f, colores.superficie),
        "1 escena" to mezclar(colores.primario, 0.55f, colores.superficie),
        "Varias escenas" to colores.primario,
    )
    fun color(valor: Double) = when {
        valor <= 0.1 -> niveles[0].second
        valor < 0.9 -> niveles[1].second
        valor < 1.9 -> niveles[2].second
        else -> niveles[3].second
    }
    val alto = max(200.dp, (presencia.filas.size * 34 + 60).dp) - 30.dp
    Column(Modifier.fillMaxWidth()) {
        Leyenda(niveles, cuadrada = true)
        DesplazableSiNoCabe(presencia.capitulos.size, extra = 80.dp) { ancho ->
            Canvas(Modifier.width(ancho).height(alto)) {
                val estilo = letraDeEje.copy(color = colores.tintaSuave)
                val izquierda = presencia.filas.maxOf { medidor.measure(it.nombre, estilo).size.width }.toFloat() + 12.dp.toPx()
                val abajo = 24.dp.toPx()
                val altoFila = (size.height - abajo) / presencia.filas.size
                val anchoColumna = (size.width - izquierda - 4.dp.toPx()) / presencia.capitulos.size
                val separacion = 2.dp.toPx()
                presencia.filas.forEachIndexed { f, fila ->
                    val arriba = altoFila * f
                    texto(medidor, fila.nombre, estilo, Offset(izquierda - 8.dp.toPx(), arriba + altoFila / 2), derecha = true)
                    fila.valores.forEachIndexed { c, valor ->
                        drawRoundRect(
                            color(valor),
                            Offset(izquierda + anchoColumna * c + separacion / 2, arriba + separacion / 2),
                            Size(anchoColumna - separacion, altoFila - separacion),
                            CornerRadius(3.dp.toPx()),
                        )
                    }
                }
                presencia.capitulos.forEachIndexed { c, orden ->
                    texto(medidor, orden.toString(), estilo, Offset(izquierda + anchoColumna * c + anchoColumna / 2, size.height - abajo / 2), centrado = true)
                }
            }
        }
    }
}

/** El donut de personajes por grupo (`castGroupsChart`): el total en el centro y la leyenda debajo. */
@Composable
fun RoscoDeGrupos(grupos: List<Pair<String, Int>>) {
    val colores = LocalColores.current
    val medidor = rememberTextMeasurer()
    val paleta = listOf(
        colores.primario, mezclar(colores.primario, 0.6f, colores.superficie), colores.atencion,
        mezclar(colores.atencion, 0.55f, colores.superficie), colores.tintaSuave, colores.contorno, colores.superficieAlta,
    )
    val total = grupos.sumOf { it.second }
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.fillMaxWidth().height(196.dp)) {
            val radio = min(size.width, size.height) / 2 - 4.dp.toPx()
            val grosor = radio * 0.34f
            val centro = Offset(size.width / 2, size.height / 2)
            val caja = Size((radio - grosor / 2) * 2, (radio - grosor / 2) * 2)
            val origen = Offset(centro.x - caja.width / 2, centro.y - caja.height / 2)
            var inicio = -90f
            grupos.forEachIndexed { i, (_, valor) ->
                val barrido = 360f * valor / max(1, total)
                drawArc(paleta[i % paleta.size], inicio, barrido, false, origen, caja, style = Stroke(grosor))
                // El borde de 2 dp de la superficie entre porciones.
                drawArc(colores.superficie, inicio + barrido - 0.6f, 1.2f, false, origen, caja, style = Stroke(grosor))
                inicio += barrido
            }
            texto(medidor, "Personajes", TextStyle(fontSize = 14.sp, color = colores.tintaSuave), Offset(centro.x, centro.y - 14.dp.toPx()), centrado = true)
            texto(medidor, total.toString(), TextStyle(fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = colores.tinta), Offset(centro.x, centro.y + 12.dp.toPx()), centrado = true)
        }
        Leyenda(grupos.mapIndexed { i, (nombre, _) -> nombre to paleta[i % paleta.size] }, cuadrada = false, centrada = true)
    }
}

/** La leyenda de ApexCharts: una marca de color y el nombre, en la tinta. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Leyenda(entradas: List<Pair<String, Color>>, cuadrada: Boolean, centrada: Boolean = false) {
    val colores = LocalColores.current
    FlowRow(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp, if (centrada) Alignment.CenterHorizontally else Alignment.Start),
    ) {
        entradas.forEach { (nombre, color) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(Modifier.size(12.dp).clip(if (cuadrada) RoundedCornerShape(2.dp) else CircleShape).background(color))
                Text(nombre, style = Textos.cuerpo.copy(fontSize = 12.sp, color = colores.tinta))
            }
        }
    }
}

/** El gráfico a lo ancho o, si los capítulos no caben a [ColumnaDeCapitulo] cada uno, desplazable (`.m-book-stats__scroll`). */
@Composable
private fun DesplazableSiNoCabe(capitulos: Int, extra: Dp = 0.dp, grafico: @Composable (Dp) -> Unit) {
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val minimo = ColumnaDeCapitulo * capitulos + extra
        if (minimo <= maxWidth) {
            grafico(maxWidth)
        } else {
            Box(Modifier.horizontalScroll(rememberScrollState())) { grafico(minimo) }
        }
    }
}

private fun DrawScope.barra(color: Color, x: Float, y: Float, ancho: Float, alto: Float, radio: Float) {
    if (alto <= 0) return
    val r = min(radio, min(ancho / 2, alto))
    val camino = Path().apply {
        moveTo(x, y + alto)
        lineTo(x, y + r)
        quadraticTo(x, y, x + r, y)
        lineTo(x + ancho - r, y)
        quadraticTo(x + ancho, y, x + ancho, y + r)
        lineTo(x + ancho, y + alto)
        close()
    }
    drawPath(camino, color)
}

private fun DrawScope.texto(medidor: TextMeasurer, texto: String, estilo: TextStyle, punto: Offset, centrado: Boolean = false, derecha: Boolean = false) {
    val medido = medidor.measure(texto, estilo)
    val x = when {
        centrado -> punto.x - medido.size.width / 2f
        derecha -> punto.x - medido.size.width
        else -> punto.x
    }
    drawText(medido, topLeft = Offset(x, punto.y - medido.size.height / 2f))
}
