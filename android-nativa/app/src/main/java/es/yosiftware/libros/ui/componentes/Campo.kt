package es.yosiftware.libros.ui.componentes

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar

/**
 * .m-field: 56 dp de alto como mínimo, `padding: 0 16px`, 12 dp entre piezas, borde de 1 dp del contorno fuerte, radio
 * de 12 dp y superficie. El icono va en el primario y el texto de ejemplo en la tinta suave. Con el foco, el anillo
 * de `:focus-visible` del Sass: 3 dp del primario al 42 %, a 2 dp del texto (es el `input` el que lo lleva).
 *
 * [descripcion] es el nombre accesible del campo: hace falta cuando no hay [ejemplo] (un buscador con la lupa sola).
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
    /** El `font: inherit` del `input`: el del cuerpo, o el de quien lo contiene (`.m-auth-field`, .78rem). */
    estilo: TextStyle = Textos.cuerpo,
    descripcion: String? = null,
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
                .then(if (descripcion != null) Modifier.semantics { contentDescription = descripcion } else Modifier)
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
            textStyle = estilo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = teclado,
            keyboardActions = acciones,
            visualTransformation = transformacion,
            interactionSource = interaccion,
            decorationBox = { texto ->
                Box {
                    if (valor.isEmpty() && ejemplo != null) Text(ejemplo, color = colores.tintaSuave, style = estilo)
                    texto()
                }
            },
        )
        alFinal()
    }
}

/**
 * El campo de `m-scoped-search` en su variante `bar` (sin borde ni fondo): la lupa, el texto con su [marcador] y, con
 * [conLimpiar], la X de limpiar. Lo usan la Biblioteca y el Catálogo, que ponen sus botones al lado y sus sugerencias
 * y chips debajo, y la búsqueda del libro, con la lupa sola (sin marcador; ronda 1 de interfaz). [descripcion] es su
 * nombre accesible.
 */
@Composable
fun CampoDeBusqueda(
    valor: String,
    alEscribir: (String) -> Unit,
    descripcion: String,
    conLimpiar: Boolean,
    alLimpiar: () -> Unit,
    tintaDeLimpiar: Color,
    modifier: Modifier = Modifier,
    marcador: String = "",
    alConfirmar: () -> Unit = {},
    alCambiarFoco: (Boolean) -> Unit = {},
) {
    val colores = LocalColores.current
    Row(
        modifier.heightIn(min = 56.dp).padding(start = Espacios.e4, end = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
        BasicTextField(
            value = valor,
            onValueChange = alEscribir,
            modifier = Modifier.weight(1f).onFocusChanged { alCambiarFoco(it.isFocused) }
                .semantics { contentDescription = descripcion },
            singleLine = true,
            textStyle = Textos.cuerpo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { alConfirmar() }),
            decorationBox = { campo ->
                Box {
                    if (valor.isEmpty() && marcador.isNotEmpty()) Text(marcador, style = Textos.cuerpo.copy(color = colores.tintaSuave), maxLines = 1)
                    campo()
                }
            },
        )
        if (conLimpiar) {
            Box(Modifier.size(44.dp).clip(CircleShape).clickable(onClick = alLimpiar), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.close), contentDescription = "Limpiar búsqueda", tint = tintaDeLimpiar, modifier = Modifier.size(24.dp))
            }
        }
    }
}
