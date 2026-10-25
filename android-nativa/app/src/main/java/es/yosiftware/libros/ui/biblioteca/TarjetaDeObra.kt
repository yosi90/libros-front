package es.yosiftware.libros.ui.biblioteca

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.tema.Colores
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra1
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/** El icono de cada estado (`readingStatusOptions`); sin estado, `help_outline` (`getStatusIcon`). */
@DrawableRes
fun iconoDeEstado(estado: TipoDeEstado?): Int = when (estado) {
    TipoDeEstado.EN_ESPERA -> Iconos.schedule
    TipoDeEstado.EN_MARCHA -> Iconos.autoStories
    TipoDeEstado.LEIDO -> Iconos.doneAll
    TipoDeEstado.POR_COMPRAR -> Iconos.addShoppingCart
    TipoDeEstado.QUIERO_LEER -> Iconos.bookmarkAdd
    TipoDeEstado.DESCARTADO -> Iconos.block
    null -> Iconos.helpOutline
}

/** El acento de la tarjeta por su estado (`--book-status-accent`). */
fun acentoDeEstado(estado: TipoDeEstado?, colores: Colores): Color = when (estado) {
    TipoDeEstado.LEIDO -> colores.exito
    TipoDeEstado.EN_MARCHA -> colores.primario
    TipoDeEstado.EN_ESPERA -> colores.atencion
    TipoDeEstado.QUIERO_LEER -> colores.terciario
    TipoDeEstado.POR_COMPRAR -> colores.tintaSuave
    TipoDeEstado.DESCARTADO -> colores.error
    null -> colores.contornoFuerte
}

/**
 * Un `linear-gradient(<angulo>deg, …)` de CSS: la línea pasa por el centro con la longitud que manda la especificación,
 * para que el degradado caiga igual que en la WebView en cualquier tamaño de caja.
 */
fun Modifier.degradadoCss(angulo: Float, vararg paradas: Pair<Float, Color>): Modifier = drawBehind {
    val radianes = angulo * PI.toFloat() / 180f
    val direccion = Offset(sin(radianes), -cos(radianes))
    val largo = abs(size.width * sin(radianes)) + abs(size.height * cos(radianes))
    val centro = Offset(size.width / 2, size.height / 2)
    drawRect(Brush.linearGradient(*paradas, start = centro - direccion * (largo / 2), end = centro + direccion * (largo / 2)))
}

/**
 * Una obra de la Biblioteca (`.m-book-card`, la plantilla `bookCard`): portada de 72 dp, autores, título, «Ver
 * ediciones» si tiene varias, su estado y su puntuación, el botón del editor y, en los libros, la barra de lectura.
 */
@Composable
fun TarjetaDeObra(obra: Obra, alAbrir: () -> Unit, alEditar: () -> Unit, alVerEdiciones: () -> Unit, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    val estado = obra.ultimoEstado
    val acento = acentoDeEstado(estado, colores)
    Box(
        modifier
            .fillMaxWidth()
            .heightIn(min = 112.dp)
            .sombra1(forma, colores)
            .clip(forma)
            .background(colores.superficie)
            .degradadoCss(112f, 0f to mezclar(acento, 0.08f), 0.52f to Color.Transparent)
            .border(1.dp, mezclar(colores.contorno, 0.78f), forma)
            .clickable(onClick = alAbrir),
    ) {
        Row(Modifier.fillMaxWidth().heightIn(min = 112.dp), horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
            Portada(obra.portada, "Portada de ${obra.nombre}", Modifier.width(72.dp).fillMaxHeight().heightIn(min = 112.dp))
            Column(Modifier.weight(1f).padding(vertical = Espacios.e3)) {
                Text(
                    obra.autores.joinToString(", ") { it.nombre },
                    style = Textos.cuerpo.copy(fontSize = rem(0.7), fontWeight = FontWeight.ExtraBold, color = colores.primario),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    obra.nombre,
                    style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.0), lineHeight = 1.16.em, color = colores.tinta, fontWeight = FontWeight.Medium),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 5.dp),
                )
                if (tieneVariasEdiciones(obra)) {
                    Box(
                        Modifier.offset(x = (-8).dp).heightIn(min = 44.dp).clip(Radios.pildora).clickable(onClick = alVerEdiciones)
                            .semantics { contentDescription = "Ver ediciones de ${obra.nombre}" }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        Text("Ver ediciones", style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.SemiBold, color = colores.tintaSuave))
                    }
                }
                Row(Modifier.fillMaxWidth().padding(top = Espacios.e3), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(painterResource(iconoDeEstado(estado)), contentDescription = null, tint = acento, modifier = Modifier.size(16.dp))
                        Text(nombreDeEstado(obra.estadoActual), style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.Bold, color = colores.tintaSuave))
                    }
                    obra.puntuacion?.takeIf { it > 0 }?.let { puntuacion ->
                        // Las estrellas, de 12 dp de ancho y montadas 2 dp una sobre otra, como en el Sass.
                        Row(Modifier.semantics { contentDescription = "$puntuacion de 5 estrellas" }) {
                            repeat(puntuacion.coerceAtMost(5)) { i ->
                                Box(Modifier.width(if (i == 0) 12.dp else 10.dp).height(16.dp)) {
                                    Icon(painterResource(Iconos.star), contentDescription = null, tint = colores.atencion, modifier = Modifier.size(16.dp).offset(x = (-2).dp))
                                }
                            }
                        }
                    }
                }
            }
            BotonDeIcono(Iconos.moreHoriz, "Modificar estado y puntuación", alEditar)
        }
        if (!obra.esAntologia) {
            val porcentaje = porcentajeLeido(obra)
            Box(
                Modifier.align(Alignment.BottomStart).padding(start = 72.dp).fillMaxWidth().height(4.dp)
                    .background(colores.superficieAlta)
                    .semantics { contentDescription = "Progreso de lectura de ${obra.nombre}" },
            ) {
                Box(Modifier.fillMaxWidth((porcentaje / 100).toFloat()).fillMaxHeight().background(colores.primario))
            }
        }
    }
}

/** Las estrellas llenas de una puntuación, para quien no quiera la tarjeta entera (el editor usa las suyas). */
@Composable
internal fun Estrella(llena: Boolean, color: Color, apagada: Color, modifier: Modifier = Modifier) {
    Icon(painterResource(if (llena) Iconos.star else Iconos.starBorder), contentDescription = null, tint = if (llena) color else apagada, modifier = modifier)
}
