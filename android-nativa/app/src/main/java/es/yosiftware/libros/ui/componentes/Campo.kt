package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar

/**
 * .m-field: 56 dp de alto como mínimo, `padding: 0 16px`, 12 dp entre piezas, borde de 1 dp del contorno fuerte, radio
 * de 12 dp y superficie. El icono va en el primario y el texto de ejemplo en la tinta suave. Con el foco, el anillo
 * de `:focus-visible` del Sass: 3 dp del primario al 42 %, a 2 dp del texto (es el `input` el que lo lleva).
 *
 * TODO(clon): comprobar en las capturas el anillo de foco dentro del campo (src/assets/css/mobile/_primitives.sass,
 * `:where(button, a, input, textarea):focus-visible`); los formularios con `mat-form-field` usan otro aspecto.
 */
@Composable
fun Campo(
    valor: String,
    alCambiar: (String) -> Unit,
    modifier: Modifier = Modifier,
    ejemplo: String? = null,
    @DrawableRes icono: Int? = null,
    unaLinea: Boolean = true,
    habilitado: Boolean = true,
    teclado: KeyboardOptions = KeyboardOptions.Default,
    acciones: KeyboardActions = KeyboardActions.Default,
    transformacion: VisualTransformation = VisualTransformation.None,
    alFinal: @Composable RowScope.() -> Unit = {},
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val interaccion = remember { MutableInteractionSource() }
    val enfocado by interaccion.collectIsFocusedAsState()
    val anillo = mezclar(colores.primario, 0.42f)
    Row(
        modifier
            .heightIn(min = 56.dp)
            .background(colores.superficie, forma)
            .border(1.dp, colores.contornoFuerte, forma)
            .padding(horizontal = Espacios.e4 + 1.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
        BasicTextField(
            value = valor,
            onValueChange = alCambiar,
            modifier = Modifier
                .weight(1f)
                .drawBehind {
                    if (!enfocado) return@drawBehind
                    val separacion = 2.dp.toPx() + 1.5.dp.toPx()
                    drawRect(
                        color = anillo,
                        topLeft = Offset(-separacion, -separacion),
                        size = Size(size.width + 2 * separacion, size.height + 2 * separacion),
                        style = Stroke(3.dp.toPx()),
                    )
                },
            enabled = habilitado,
            singleLine = unaLinea,
            textStyle = Textos.cuerpo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = teclado,
            keyboardActions = acciones,
            visualTransformation = transformacion,
            interactionSource = interaccion,
            decorationBox = { texto ->
                Box {
                    if (valor.isEmpty() && ejemplo != null) Text(ejemplo, color = colores.tintaSuave, style = Textos.cuerpo)
                    texto()
                }
            },
        )
        alFinal()
    }
}
