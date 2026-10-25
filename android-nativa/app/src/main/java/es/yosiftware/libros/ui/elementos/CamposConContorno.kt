package es.yosiftware.libros.ui.elementos

import androidx.annotation.DrawableRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.PopupProperties
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

/**
 * Un `mat-form-field` con contorno de la vista móvil (`mobile-outlined-field-tokens`): 44 dp de alto, la etiqueta sobre
 * el borde, el contorno fuerte (primario con el foco), y debajo el error en rojo si lo hay. [alPulsar] lo hace solo de
 * lectura y pulsable (los desplegables).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CampoConContorno(
    etiqueta: String,
    valor: String,
    alCambiar: (String) -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
    numerico: Boolean = false,
    maximo: Int? = null,
    @DrawableRes iconoFinal: Int? = null,
    soloLectura: Boolean = false,
    alEnfocar: () -> Unit = {},
    alIntro: (() -> Unit)? = null,
) {
    val colores = LocalColores.current
    val interaccion = remember { MutableInteractionSource() }
    val tonos = OutlinedTextFieldDefaults.colors(
        focusedTextColor = colores.tinta, unfocusedTextColor = colores.tinta,
        focusedBorderColor = colores.primario, unfocusedBorderColor = colores.contornoFuerte,
        errorBorderColor = colores.error, errorLabelColor = colores.error,
        focusedLabelColor = colores.primario, unfocusedLabelColor = colores.tintaSuave,
        focusedTrailingIconColor = colores.primario, unfocusedTrailingIconColor = colores.primario,
        cursorColor = colores.primario,
        focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent,
    )
    Column(modifier) {
        BasicTextField(
            value = valor,
            onValueChange = { nuevo -> alCambiar(maximo?.let { nuevo.take(it) } ?: nuevo) },
            readOnly = soloLectura,
            singleLine = true,
            textStyle = Textos.cuerpo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = if (numerico) KeyboardType.Number else KeyboardType.Text),
            keyboardActions = KeyboardActions(onDone = { alIntro?.invoke() }),
            interactionSource = interaccion,
            modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp).onFocusChanged { if (it.isFocused) alEnfocar() },
            decorationBox = { interior ->
                OutlinedTextFieldDefaults.DecorationBox(
                    value = valor,
                    innerTextField = interior,
                    enabled = true,
                    singleLine = true,
                    visualTransformation = VisualTransformation.None,
                    interactionSource = interaccion,
                    isError = error != null,
                    label = { Text(etiqueta) },
                    trailingIcon = iconoFinal?.let { { Icon(painterResource(it), contentDescription = null, modifier = Modifier.size(20.dp)) } },
                    colors = tonos,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    container = { OutlinedTextFieldDefaults.Container(enabled = true, isError = error != null, interactionSource = interaccion, colors = tonos, shape = androidx.compose.foundation.shape.RoundedCornerShape(Radios.xs)) },
                )
            },
        )
        if (error != null) Text(error, style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error), modifier = Modifier.padding(start = 12.dp, top = 4.dp))
    }
}

/** Un `mat-select` con contorno: el campo pulsable con la flecha y el menú de opciones (`mobile-option-panel`). */
@Composable
fun <T> SelectorConContorno(
    etiqueta: String,
    opciones: List<Pair<T, String>>,
    elegida: T?,
    alElegir: (T) -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box(modifier) {
        CampoConContorno(
            etiqueta, opciones.firstOrNull { it.first == elegida }?.second.orEmpty(), {}, Modifier.fillMaxWidth(),
            error = error, iconoFinal = Iconos.arrowDropDown, soloLectura = true, alEnfocar = { abierto = true },
        )
        // Toda la superficie abre el menú (el campo de solo lectura no recibe el toque si ya tenía el foco).
        Box(Modifier.matchParentSize().clickableSinOnda { abierto = true })
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficieContenedor, modifier = Modifier.widthIn(min = 200.dp)) {
            opciones.forEach { (valor, texto) ->
                DropdownMenuItem(text = { Text(texto, style = Textos.cuerpo.copy(color = colores.tinta)) }, onClick = { abierto = false; alElegir(valor) },
                    modifier = Modifier.heightIn(min = 44.dp))
            }
        }
    }
}

/**
 * Un autocompletado con contorno (`mat-autocomplete`): lo escrito filtra las opciones, elegir una fija su valor, y
 * escribir de nuevo la deja sin elegir (hay que elegir de la lista).
 */
@Composable
fun AutocompletadoConContorno(
    etiqueta: String,
    texto: String,
    opciones: List<Pair<Int, String>>,
    vacio: String,
    alEscribir: (String) -> Unit,
    alElegir: (Int) -> Unit,
    modifier: Modifier = Modifier,
    ayuda: String? = null,
) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box(modifier) {
        CampoConContorno(etiqueta, texto, { abierto = true; alEscribir(it) }, Modifier.fillMaxWidth(), iconoFinal = Iconos.unfoldMore, alEnfocar = { abierto = true })
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, properties = PopupProperties(focusable = false), containerColor = colores.superficieContenedor, modifier = Modifier.widthIn(max = 300.dp)) {
            if (opciones.isEmpty()) DropdownMenuItem(text = { Text(vacio, style = Textos.cuerpo.copy(color = colores.tintaSuave)) }, onClick = {}, enabled = false)
            opciones.forEach { (id, nombre) ->
                DropdownMenuItem(text = { Text(nombre, style = Textos.cuerpo.copy(color = colores.tinta)) }, onClick = { abierto = false; alElegir(id) }, modifier = Modifier.heightIn(min = 44.dp))
            }
        }
    }
    if (ayuda != null) Text(ayuda, style = Textos.cuerpo.copy(fontSize = rem(0.75), color = mezclar(colores.tinta, 0.7f)), modifier = Modifier.padding(start = 12.dp, top = 4.dp))
}

internal fun Modifier.clickableSinOnda(alPulsar: () -> Unit): Modifier = this.then(
    Modifier.clickable(interactionSource = null, indication = null, onClick = alPulsar),
)
