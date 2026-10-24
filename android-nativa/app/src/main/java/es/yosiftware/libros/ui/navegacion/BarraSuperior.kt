package es.yosiftware.libros.ui.navegacion

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.PuntoSinLeer
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar

/**
 * La app bar (src/app/components/mobile/ui/mobile-app-bar/): 64 dp como mínimo contando la zona segura de arriba, con
 * 8 dp de relleno (o la zona segura, si es mayor), 12 a los lados y 10 entre piezas. A la izquierda, la acción
 * inicial si la hay; luego el eyebrow (.64rem en el primario) y el título (display, 1.08rem), y a la derecha las
 * acciones. El fondo es el lienzo al 88 % y abajo lleva un borde del contorno al 64 %.
 */
@Composable
fun BarraSuperior(
    titulo: String,
    modifier: Modifier = Modifier,
    eyebrow: String = "Memoria Bibliográfica",
    @DrawableRes iconoInicial: Int? = null,
    etiquetaInicial: String = "Inicio",
    alPulsarInicial: () -> Unit = {},
    acciones: @Composable RowScope.() -> Unit = {},
) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val borde = mezclar(colores.contorno, 0.64f)
    Row(
        modifier
            .fillMaxWidth()
            .heightIn(min = Alturas.barraSuperior)
            .background(mezclar(colores.lienzo, 0.88f))
            .drawBehind {
                val grosor = 1.dp.toPx()
                drawRect(borde, Offset(0f, size.height - grosor), Size(size.width, grosor))
            }
            .padding(
                top = max(Espacios.e2, zona.calculateTopPadding()),
                bottom = Espacios.e2 + 1.dp,
                start = max(Espacios.e3, zona.calculateLeftPadding(direccion)),
                end = max(Espacios.e3, zona.calculateRightPadding(direccion)),
            ),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (iconoInicial != null) BotonDeIcono(iconoInicial, etiquetaInicial, alPulsarInicial, color = colores.primario)
        Column(Modifier.weight(1f)) {
            Text(eyebrow.uppercase(), color = colores.primario, style = Textos.eyebrowDeBarra, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                titulo,
                Modifier.padding(top = 2.dp),
                color = colores.tinta,
                style = Textos.tituloDeBarra,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e1), verticalAlignment = Alignment.CenterVertically, content = acciones)
    }
}

/**
 * `.m-dashboard-actions__button`: el acceso a Perfil de la app bar, un círculo de 48 dp con la foto de 34 dp y su
 * borde, y el punto de 9 dp a 5 dp de la esquina si hay mensajes sin leer.
 */
@Composable
fun BotonDePerfil(mensajesSinLeer: Int, alPulsar: () -> Unit) {
    val descripcion = if (mensajesSinLeer > 0) "Abrir perfil, $mensajesSinLeer mensajes sin leer" else "Abrir perfil"
    Avatar(
        tamanoFoto = 34.dp,
        tamanoCaja = Alturas.botonDeIcono,
        sinLeer = mensajesSinLeer > 0,
        punto = PuntoSinLeer(9.dp, 5.dp),
        // Sin recortar la caja: el punto sobresale del círculo, como el `::after` de la web.
        modifier = Modifier
            .clickable(remember { MutableInteractionSource() }, ripple(bounded = false, radius = 24.dp), role = Role.Button, onClick = alPulsar)
            .semantics { contentDescription = descripcion },
    )
}
