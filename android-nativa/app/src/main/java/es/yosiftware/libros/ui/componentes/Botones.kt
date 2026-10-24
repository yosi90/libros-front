package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos

/** Las variantes de `.m-button`: la normal, `--tonal` y `--outline`. */
enum class VarianteDeBoton { Primario, Tonal, Contorno }

/**
 * .m-button: píldora de 48 dp de alto como mínimo, `padding: 10px 20px`, borde de 1 px (transparente salvo en
 * `--outline`), texto `700 .9rem/1` y 8 dp entre el icono y el texto. Al pulsar baja 1 dp (`:active`).
 *
 * TODO(clon): el aspecto deshabilitado. `.m-button` no lo define (src/assets/css/mobile/_primitives.sass); cada vista
 * lo pone a su manera. Aquí, sin cambio visual.
 */
@Composable
fun Boton(
    texto: String,
    alPulsar: () -> Unit,
    modifier: Modifier = Modifier,
    variante: VarianteDeBoton = VarianteDeBoton.Primario,
    @DrawableRes icono: Int? = null,
    habilitado: Boolean = true,
) {
    val colores = LocalColores.current
    val (fondo, tinta, borde) = when (variante) {
        VarianteDeBoton.Primario -> Triple(colores.primario, colores.sobrePrimario, Color.Transparent)
        VarianteDeBoton.Tonal -> Triple(colores.contenedorPrimario, colores.sobreContenedorPrimario, Color.Transparent)
        VarianteDeBoton.Contorno -> Triple(Color.Transparent, colores.primario, colores.contorno)
    }
    val interaccion = remember { MutableInteractionSource() }
    val pulsado by interaccion.collectIsPressedAsState()
    Row(
        modifier
            .offset { IntOffset(0, if (pulsado) 1.dp.roundToPx() else 0) }
            .heightIn(min = 48.dp)
            .clip(Radios.pildora)
            .background(fondo)
            .border(1.dp, borde, Radios.pildora)
            .clickable(interaccion, ripple(color = tinta), enabled = habilitado, role = Role.Button, onClick = alPulsar)
            // El borde de 1 dp va dentro de la caja, como el `border-box` del Sass: 1 + 10 y 1 + 20.
            .padding(horizontal = 21.dp, vertical = 11.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = tinta, modifier = Modifier.size(24.dp))
        Text(texto, color = tinta, style = Textos.boton)
    }
}

/**
 * El botón de texto de la APK: `.m-auth-link` (src/assets/css/mobile/_public-auth.sass), sin fondo ni borde, 44 dp de
 * alto como mínimo y texto `.8rem` de 800 en el color primario. `.m-button` no tiene variante de texto. Con [subrayado],
 * como el `<a>` de «He olvidado mi contraseña».
 */
@Composable
fun BotonDeTexto(texto: String, alPulsar: () -> Unit, modifier: Modifier = Modifier, habilitado: Boolean = true, subrayado: Boolean = false) {
    val colores = LocalColores.current
    Box(
        modifier
            .heightIn(min = Alturas.tactilMinimo)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar),
        contentAlignment = Alignment.CenterEnd,
    ) {
        Text(texto, color = colores.primario, style = if (subrayado) Textos.enlace.copy(textDecoration = TextDecoration.Underline) else Textos.enlace)
    }
}

/**
 * .m-icon-button: un círculo de 48 dp sin fondo, con el icono en el color del texto (o el que se pase, como el primario
 * de las acciones de la app bar). [descripcion] es su `aria-label`.
 */
@Composable
fun BotonDeIcono(
    @DrawableRes icono: Int,
    descripcion: String,
    alPulsar: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = LocalColores.current.tinta,
    habilitado: Boolean = true,
) {
    Box(
        modifier
            .size(Alturas.botonDeIcono)
            .clip(CircleShape)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icono), contentDescription = descripcion, tint = color, modifier = Modifier.size(24.dp))
    }
}
