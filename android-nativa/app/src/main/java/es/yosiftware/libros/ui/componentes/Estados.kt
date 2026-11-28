package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

// Los estados de una pantalla o de una lista: vacío, sin resultados, cargando. La regla común de la ronda 1 de interfaz
// (docs/diseno/interfaz-apk-2026-11/, P3; kits 1.111 a 2026.11.6):
// - una pantalla vacía con salida: un icono y el botón ([VacioConSalida]);
// - una búsqueda sin resultados: una frase y el botón ([SinResultados]);
// - una lista vacía dentro de una sección: dos o tres palabras en gris, sin icono grande ([ListaVacia]);
// - cargando: la rueda sola, con su nombre accesible ([Cargando]);
// - los errores con «Reintentar» no cambian: siguen en cada pantalla.

/** La rueda de carga: un anillo de la superficie alta con un cuarto del primario que gira cada 0,8 s. */
@Composable
fun Rueda(tamano: Dp, grosor: Dp, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val giro by rememberInfiniteTransition(label = "rueda").animateFloat(0f, 360f, infiniteRepeatable(tween(800, easing = LinearEasing), RepeatMode.Restart), label = "giro")
    Box(
        modifier.size(tamano).rotate(giro).drawBehind {
            val g = grosor.toPx()
            val caja = Size(size.width - g, size.height - g)
            drawArc(colores.superficieAlta, 0f, 360f, false, Offset(g / 2, g / 2), caja, style = Stroke(g))
            drawArc(colores.primario, -135f, 90f, false, Offset(g / 2, g / 2), caja, style = Stroke(g, cap = StrokeCap.Butt))
        },
    )
}

/**
 * Cargando: la rueda sola, centrada, sin texto visible. [descripcion] es su nombre accesible («Cargando tu
 * biblioteca»): lo que antes se leía debajo.
 */
@Composable
fun Cargando(descripcion: String, modifier: Modifier = Modifier, alturaMinima: Dp = 120.dp, tamano: Dp = 36.dp) {
    Box(
        modifier.fillMaxWidth().heightIn(min = alturaMinima).padding(Espacios.e6),
        contentAlignment = Alignment.Center,
    ) {
        Rueda(tamano, if (tamano > 24.dp) 3.dp else 2.dp, Modifier.semantics { contentDescription = descripcion })
    }
}

/**
 * Una pantalla vacía con salida: el icono en el primario y el botón, con 16 dp entre ellos. El icono lleva el nombre
 * accesible de lo que dice ([descripcion], «Tu biblioteca está vacía»), porque no hay texto que lo cuente.
 */
@Composable
fun VacioConSalida(
    @DrawableRes icono: Int,
    descripcion: String,
    accion: String,
    alPulsar: () -> Unit,
    modifier: Modifier = Modifier,
    variante: VarianteDeBoton = VarianteDeBoton.Primario,
    alturaMinima: Dp = 190.dp,
) {
    val colores = LocalColores.current
    Column(
        modifier.fillMaxWidth().heightIn(min = alturaMinima).padding(horizontal = Espacios.e6, vertical = Espacios.e8),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Espacios.e4, Alignment.CenterVertically),
    ) {
        Icon(painterResource(icono), contentDescription = descripcion, tint = colores.primario, modifier = Modifier.size(44.dp))
        Boton(accion, alPulsar, variante = variante)
    }
}

/**
 * Una búsqueda sin resultados: la frase («No encontramos coincidencias», en el display de 17 sp) y, si hay, el botón
 * que da la salida (en contorno), sin explicación debajo.
 */
@Composable
fun SinResultados(
    frase: String,
    modifier: Modifier = Modifier,
    accion: String? = null,
    alPulsar: () -> Unit = {},
    alturaMinima: Dp = 170.dp,
) {
    val colores = LocalColores.current
    Column(
        modifier.fillMaxWidth().heightIn(min = alturaMinima).padding(horizontal = Espacios.e6, vertical = Espacios.e8),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Espacios.e4, Alignment.CenterVertically),
    ) {
        Text(
            frase,
            color = colores.tinta,
            style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(17.0 / 16), fontWeight = FontWeight.Bold, lineHeight = 1.3.em),
            textAlign = TextAlign.Center,
        )
        if (accion != null) Boton(accion, alPulsar, variante = VarianteDeBoton.Contorno)
    }
}

/**
 * Una lista vacía dentro de una sección: dos o tres palabras en gris («Sin eventos», «Sin notificaciones»), centradas
 * y sin icono.
 */
@Composable
fun ListaVacia(texto: String, modifier: Modifier = Modifier, alturaMinima: Dp = 96.dp) {
    Box(
        modifier.fillMaxWidth().heightIn(min = alturaMinima).padding(Espacios.e6),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = LocalColores.current.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(13.0 / 16)), textAlign = TextAlign.Center)
    }
}
