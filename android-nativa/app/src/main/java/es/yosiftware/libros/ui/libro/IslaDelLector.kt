package es.yosiftware.libros.ui.libro

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2

/**
 * `.native-reader-island`: el libro minimizado, una píldora de 56 dp sobre la navegación de abajo (desde 600 dp, abajo y
 * a la derecha del rail), de hasta 520 dp: restaurar, la portada y el nombre («Libro abierto»), y cerrar. Sube al
 * aparecer (200 ms).
 */
@Composable
fun IslaDelLector(vm: LibroViewModel) {
    val obra = vm.abierto
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    val abajo = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    AnimatedVisibility(
        visible = obra != null && vm.minimizado,
        enter = fadeIn(tween(200)) + slideInVertically(tween(200)) { 24 },
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(
            Modifier.fillMaxSize().padding(
                start = if (ancha) Alturas.anchoRail + Espacios.e4 else Espacios.e3,
                end = Espacios.e3,
                bottom = if (ancha) maxOf(Espacios.e4, abajo) else Alturas.navegacionInferior + abajo + Espacios.e3,
            ),
            contentAlignment = Alignment.BottomCenter,
        ) {
            val forma = Radios.pildora
            Row(
                // La altura de su contenido: sin ella, el `fillMaxHeight` del botón de cerrar estira la píldora a toda la
                // pantalla (un óvalo encima de todo).
                Modifier.widthIn(max = 520.dp).fillMaxWidth().height(IntrinsicSize.Min).heightIn(min = Alturas.islaDelLector)
                    .sombra2(forma, colores)
                    .clip(forma)
                    .background(mezclar(colores.superficie, 0.96f))
                    .border(1.dp, colores.contorno, forma)
                    .semantics { contentDescription = "Lector minimizado" },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.width(56.dp), contentAlignment = Alignment.Center) {
                    Box(
                        Modifier.size(44.dp).clip(CircleShape).background(colores.contenedorPrimario)
                            .clickable(onClick = vm::restaurar).semantics { contentDescription = "Volver al libro abierto" },
                        contentAlignment = Alignment.Center,
                    ) { Icon(painterResource(Iconos.keyboardArrowUp), contentDescription = null, tint = colores.sobreContenedorPrimario, modifier = Modifier.size(24.dp)) }
                }
                Row(
                    Modifier.weight(1f).clickable(onClick = vm::restaurar).padding(horizontal = Espacios.e2, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    val portada = obra?.portada
                    if (!portada.isNullOrEmpty()) Portada(portada, null, Modifier.size(34.dp).clip(RoundedCornerShape(8.dp)))
                    Column(Modifier.weight(1f)) {
                        Text("Libro abierto", style = Textos.cuerpo.copy(fontSize = rem(0.68), color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(obra?.nombre.orEmpty(), style = Textos.cuerpo.copy(fontSize = rem(0.86), fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                Box(
                    Modifier.width(44.dp).heightIn(min = 56.dp).fillMaxHeight()
                        .drawBehind { drawRect(colores.contorno, Offset.Zero, Size(1.dp.toPx(), size.height)) }
                        .clickable(onClick = vm::cerrar).semantics { contentDescription = "Cerrar el libro" },
                    contentAlignment = Alignment.Center,
                ) { Icon(painterResource(Iconos.close), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(24.dp)) }
            }
        }
    }
}
