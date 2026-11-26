package es.yosiftware.libros.ui.libro

import androidx.annotation.DrawableRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos

// Las piezas del «Cuaderno» que comparten el capítulo ([PantallaCapitulo]) y la ficha de los elementos
// (`ui/elementos/PantallaElementos.kt`): las clases de la vista de libro de la web, no las primitivas de Mobile de
// `ui/componentes/`.

/** Ensancha el elemento [lado] por cada lado sin mover lo de alrededor (el `margin-inline` negativo de la web). */
internal fun Modifier.sobresalir(lado: Dp): Modifier = layout { medible, limites ->
    val extra = lado.roundToPx()
    val ancho = (limites.maxWidth + 2 * extra).coerceAtLeast(0)
    val colocable = medible.measure(limites.copy(minWidth = ancho, maxWidth = ancho))
    layout(limites.maxWidth, colocable.height) { colocable.place(-extra, 0) }
}

/** `app-web-save-status`: el icono y el texto del estado del guardado, con su color. */
@Composable
internal fun IndicadorDeGuardado(estado: EstadoDelGuardado, texto: String = estado.texto) {
    val colores = LocalColores.current
    val (icono, color) = when (estado) {
        EstadoDelGuardado.NADA -> return
        EstadoDelGuardado.GUARDANDO -> Iconos.syncAlt to colores.tintaSuave
        EstadoDelGuardado.GUARDADO -> Iconos.cloudDone to colores.tintaSuave
        EstadoDelGuardado.ERROR -> Iconos.errorOutline to colores.error
        EstadoDelGuardado.INCOMPLETO -> Iconos.warning to colores.atencion
    }
    Row(
        Modifier.heightIn(min = 28.dp).semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
        Text(texto, style = Textos.cuerpo.copy(fontSize = 13.sp, color = color))
    }
}

/** `.text-button` de la web: el texto en el primario, con su icono delante si lo lleva; 44 dp de objetivo. */
@Composable
internal fun BotonDeTexto(texto: String, @DrawableRes icono: Int? = null, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(Radios.sm)).clickable(role = Role.Button, onClick = alPulsar).padding(horizontal = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
        Text(texto, style = Textos.boton.copy(fontSize = 14.sp, color = colores.primario))
    }
}

/** Un botón de icono (de 18 dp, o 22 si [grande]) con 44 de objetivo, en la tinta suave. */
@Composable
internal fun BotonDeIconoPequeno(@DrawableRes icono: Int, descripcion: String, grande: Boolean = false, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.size(44.dp).clip(CircleShape).clickable(role = Role.Button, onClick = alPulsar).semantics { contentDescription = descripcion },
        contentAlignment = Alignment.Center,
    ) { Icon(painterResource(icono), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(if (grande) 22.dp else 18.dp)) }
}
