package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos

/** Los estados de `.m-chip`: el normal, `--selected` y `--success`. */
enum class EstadoDeChip { Normal, Seleccionado, Exito }

/**
 * .m-chip: píldora de 32 dp de alto como mínimo, `padding: 6px 12px`, 6 dp entre icono y texto, borde del contorno y
 * texto `.78rem` de 700 en el secundario. Mide 32 dp como en la web; al tocarlo, Compose amplía la zona táctil hasta el
 * mínimo del sistema sin cambiar el diseño.
 */
@Composable
fun Chip(
    texto: String,
    modifier: Modifier = Modifier,
    estado: EstadoDeChip = EstadoDeChip.Normal,
    @DrawableRes icono: Int? = null,
    alPulsar: (() -> Unit)? = null,
) {
    val colores = LocalColores.current
    val (fondo, tinta, borde) = when (estado) {
        EstadoDeChip.Normal -> Triple(colores.superficie, colores.secundario, colores.contorno)
        EstadoDeChip.Seleccionado -> Triple(colores.contenedorPrimario, colores.sobreContenedorPrimario, Color.Transparent)
        // El texto de `--success` es un color fijo en el Sass, igual en los dos temas.
        EstadoDeChip.Exito -> Triple(colores.contenedorExito, Color(0xFF123822), Color.Transparent)
    }
    Row(
        modifier
            .heightIn(min = 32.dp)
            .clip(Radios.pildora)
            .background(fondo)
            .border(1.dp, borde, Radios.pildora)
            .then(if (alPulsar != null) Modifier.clickable(role = Role.Button, onClick = alPulsar) else Modifier)
            .semantics { if (estado == EstadoDeChip.Seleccionado) selected = true }
            .padding(horizontal = 13.dp, vertical = 7.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // TODO(clon): `.m-chip` no fija el tamaño del icono, así que es el de `mat-icon` (24); revisar en cada vista que
        // lo use si su Sass lo cambia (src/app/components/mobile/**).
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = tinta, modifier = Modifier.size(24.dp))
        Text(texto, color = tinta, style = Textos.chip)
    }
}
