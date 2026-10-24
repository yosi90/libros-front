package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos

/**
 * .m-list-item: 64 dp de alto como mínimo, 12 dp de relleno y entre piezas, radio de 12 dp y superficie. El icono va en
 * un círculo de 42 dp del contenedor primario; el texto, en negrita, y debajo el secundario (.8rem, tinta suave, una
 * línea con puntos suspensivos, a 3 dp). [alFinal] es lo que vaya a la derecha.
 */
@Composable
fun FilaDeLista(
    titulo: String,
    modifier: Modifier = Modifier,
    secundario: String? = null,
    @DrawableRes icono: Int? = null,
    alPulsar: (() -> Unit)? = null,
    alFinal: @Composable RowScope.() -> Unit = {},
) {
    val colores = LocalColores.current
    Row(
        modifier
            .heightIn(min = 64.dp)
            .clip(RoundedCornerShape(Radios.sm))
            .background(colores.superficie)
            .then(if (alPulsar != null) Modifier.clickable(onClick = alPulsar) else Modifier)
            .padding(Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) {
            Box(Modifier.size(42.dp).background(colores.contenedorPrimario, CircleShape), contentAlignment = Alignment.Center) {
                Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            }
        }
        Column(Modifier.weight(1f)) {
            Text(titulo, color = colores.tinta, style = Textos.filaPrincipal)
            if (secundario != null) {
                Text(
                    secundario,
                    Modifier.padding(top = 3.dp),
                    color = colores.tintaSuave,
                    style = Textos.filaSecundaria,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        alFinal()
    }
}
