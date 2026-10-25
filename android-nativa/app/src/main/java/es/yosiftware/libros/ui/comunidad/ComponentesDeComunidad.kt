package es.yosiftware.libros.ui.comunidad

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

// Las piezas comunes de las pantallas de Comunidad, con el Sass de la APK de Capacitor (5dc3120): `.m-list-item` de
// `_primitives.sass` y las de `mobile-community-view`, `mobile-social-summary-view` y `mobile-club-access-center-view`.

/**
 * `.m-list-item` con el borde de las listas de clubes y del resumen: el icono en su círculo, el título, la línea de
 * apoyo y el icono final. Con [resaltado], el de `.has-pending`; con [valorGrande], el título en display (las cifras del
 * resumen); con [simbolo], el del ecosistema delante de la línea de apoyo (lo que se abre en la web social).
 */
@Composable
fun ElementoDeLista(
    @DrawableRes icono: Int,
    titulo: String,
    apoyo: String?,
    alPulsar: (() -> Unit)?,
    modifier: Modifier = Modifier,
    @DrawableRes iconoFinal: Int? = Iconos.chevronRight,
    resaltado: Boolean = false,
    valorGrande: Boolean = false,
    simbolo: Boolean = false,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        modifier.fillMaxWidth().heightIn(min = 64.dp).clip(forma)
            .background(if (resaltado) colores.contenedorPrimario else colores.superficie)
            .border(1.dp, if (resaltado) colores.primario else colores.contorno, forma)
            .then(if (alPulsar != null) Modifier.clickable(role = Role.Button, onClick = alPulsar) else Modifier)
            .padding(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Box(
            Modifier.size(42.dp).clip(CircleShape).background(if (resaltado) colores.primario else colores.contenedorPrimario),
            contentAlignment = Alignment.Center,
        ) {
            Icon(painterResource(icono), contentDescription = null, tint = if (resaltado) colores.sobrePrimario else colores.primario)
        }
        Column(Modifier.weight(1f)) {
            Text(
                titulo,
                color = colores.tinta,
                style = if (valorGrande) Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.Bold, fontSize = rem(1.35)) else Textos.filaPrincipal,
                maxLines = if (valorGrande) 1 else 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (!apoyo.isNullOrEmpty()) {
                Row(Modifier.padding(top = 3.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (simbolo) Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(15.dp))
                    Text(apoyo, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
        if (iconoFinal != null) {
            Icon(
                painterResource(iconoFinal),
                contentDescription = if (iconoFinal == Iconos.openInNew) "Se abre en el navegador" else null,
                tint = colores.tintaSuave,
            )
        }
    }
}

/** Una insignia con un número (`em`): la píldora del primario. */
@Composable
fun Insignia(numero: Int, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    Text(
        if (numero > 99) "99+" else "$numero",
        modifier.widthIn(min = 20.dp).clip(RoundedCornerShape(50)).background(colores.primario).padding(3.dp),
        color = colores.sobrePrimario,
        style = Textos.cuerpo.copy(fontSize = rem(0.6), fontWeight = FontWeight.Bold, lineHeight = rem(0.6)),
        textAlign = TextAlign.Center,
    )
}

/**
 * Una pestaña en caja (`.m-community-clubs__tabs button`): el icono sobre la etiqueta, con el borde; la activa, en el
 * contenedor primario; la desactivada, a .45. La insignia, arriba a la derecha.
 */
@Composable
fun PestanaEnCaja(
    @DrawableRes icono: Int,
    etiqueta: String,
    activa: Boolean,
    alPulsar: () -> Unit,
    modifier: Modifier = Modifier,
    habilitada: Boolean = true,
    insignia: Int = 0,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val tinta = if (activa) colores.primario else colores.tintaSuave
    Box(modifier.alpha(if (habilitada) 1f else 0.45f)) {
        Column(
            Modifier.fillMaxWidth().widthIn(min = 72.dp).heightIn(min = 60.dp).clip(forma)
                .background(if (activa) colores.contenedorPrimario else colores.superficie)
                .border(1.dp, if (activa) colores.primario else colores.contorno, forma)
                .clickable(enabled = habilitada, role = Role.Tab, onClick = alPulsar)
                .padding(horizontal = Espacios.e2, vertical = Espacios.e1),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically),
        ) {
            Icon(painterResource(icono), contentDescription = null, tint = tinta)
            Text(etiqueta, color = tinta, style = Textos.cuerpo.copy(fontSize = rem(0.7), lineHeight = rem(0.9)), maxLines = 1)
        }
        if (insignia > 0) Insignia(insignia, Modifier.align(Alignment.TopEnd).offset((-2).dp, 2.dp))
    }
}

/**
 * Un botón de filtro en caja (`.m-club-access__kinds button`): icono y etiqueta en fila, con su insignia detrás; el
 * activo, en el contenedor primario.
 */
@Composable
fun FiltroEnCaja(etiqueta: String, activo: Boolean, alPulsar: () -> Unit, modifier: Modifier = Modifier, @DrawableRes icono: Int? = null, insignia: Int = 0) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val tinta = if (activo) colores.primario else colores.tintaSuave
    Row(
        modifier.heightIn(min = 48.dp).clip(forma)
            .background(if (activo) colores.contenedorPrimario else colores.superficie)
            .border(1.dp, if (activo) colores.primario else colores.contorno, forma)
            .clickable(role = Role.Tab, onClick = alPulsar)
            .padding(Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = tinta)
        Text(etiqueta, color = tinta, style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.Bold))
        if (insignia > 0) Insignia(insignia)
    }
}

/** El estado de una pantalla (`__state`): cargando, vacío o error, con el icono grande y, si hay, un botón. */
@Composable
fun EstadoDePantalla(
    @DrawableRes icono: Int,
    texto: String?,
    modifier: Modifier = Modifier,
    titulo: String? = null,
    error: Boolean = false,
    tamanoIcono: Int = 48,
    alturaMinima: Int = 220,
    boton: Pair<String, () -> Unit>? = null,
) {
    val colores = LocalColores.current
    val tinta = if (error) colores.error else colores.tintaSuave
    Column(
        modifier.fillMaxWidth().heightIn(min = alturaMinima.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterVertically),
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = if (error) colores.error else colores.primario, modifier = Modifier.size(tamanoIcono.dp))
        if (titulo != null) Text(titulo, color = tinta, style = Textos.filaPrincipal, textAlign = TextAlign.Center)
        if (!texto.isNullOrEmpty()) Text(texto, color = tinta, style = Textos.cuerpo, textAlign = TextAlign.Center)
        boton?.let { (etiqueta, accion) -> Boton(etiqueta, accion, Modifier.padding(top = Espacios.e2), variante = VarianteDeBoton.Contorno) }
    }
}

/** El título de una lista de clubes (`.m-club-list h3`): mayúsculas pequeñas en el color de apoyo. */
@Composable
fun TituloDeLista(texto: String) {
    Text(
        texto.uppercase(),
        Modifier.padding(top = Espacios.e3),
        color = LocalColores.current.tintaSuave,
        style = Textos.cuerpo.copy(fontSize = rem(0.75), letterSpacing = 0.07.em, fontWeight = FontWeight.Bold),
    )
}

/** Un texto de apoyo pequeño (`__hint`) o de error (`__error`). */
@Composable
fun Pista(texto: String, modifier: Modifier = Modifier, error: Boolean = false) {
    val colores = LocalColores.current
    Text(texto, modifier, color = if (error) colores.error else colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
}

/**
 * Un campo de los formularios de clubes (`.m-club-form input/textarea`): 48 dp como mínimo, relleno de 12, el borde
 * fuerte y radio de 12. Con [lineas] mayor que 1, un `textarea` (112 dp como mínimo).
 */
@Composable
fun CampoDeFormulario(
    valor: String,
    alCambiar: (String) -> Unit,
    ejemplo: String,
    modifier: Modifier = Modifier,
    lineas: Int = 1,
    maximo: Int? = null,
    numerico: Boolean = false,
    correo: Boolean = false,
    habilitado: Boolean = true,
    alEnviar: (() -> Unit)? = null,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    BasicTextField(
        valor,
        { nuevo -> alCambiar(maximo?.let { nuevo.take(it) } ?: nuevo) },
        modifier.fillMaxWidth().heightIn(min = if (lineas > 1) 112.dp else 48.dp).clip(forma)
            .background(colores.superficie).border(1.dp, colores.contornoFuerte, forma),
        enabled = habilitado,
        singleLine = lineas == 1,
        minLines = lineas,
        textStyle = Textos.cuerpo.copy(color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        keyboardOptions = KeyboardOptions(
            keyboardType = when {
                numerico -> KeyboardType.Decimal
                correo -> KeyboardType.Email
                else -> KeyboardType.Text
            },
            imeAction = if (alEnviar != null) ImeAction.Done else ImeAction.Default,
        ),
        keyboardActions = KeyboardActions(onDone = { alEnviar?.invoke() }),
        decorationBox = { interior ->
            Box(Modifier.padding(Espacios.e3), contentAlignment = if (lineas > 1) Alignment.TopStart else Alignment.CenterStart) {
                if (valor.isEmpty()) Text(ejemplo, color = colores.tintaSuave, style = Textos.cuerpo, maxLines = lineas)
                interior()
            }
        },
    )
}

/** Un `select` de los formularios de clubes, con el aspecto de [CampoDeFormulario] y su menú. */
@Composable
fun <T> SelectorDeFormulario(opciones: List<Pair<T, String>>, elegida: T, alElegir: (T) -> Unit, modifier: Modifier = Modifier, habilitado: Boolean = true) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    var abierto by remember { mutableStateOf(false) }
    Box(modifier) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(forma).background(colores.superficie)
                .border(1.dp, colores.contornoFuerte, forma)
                .clickable(enabled = habilitado, role = Role.DropdownList) { abierto = true }
                .padding(horizontal = Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(opciones.firstOrNull { it.first == elegida }?.second.orEmpty(), Modifier.weight(1f), color = colores.tinta, style = Textos.cuerpo, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Icon(painterResource(Iconos.arrowDropDown), contentDescription = null, tint = colores.tintaSuave)
        }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficieContenedor) {
            opciones.forEach { (valor, texto) ->
                DropdownMenuItem(text = { Text(texto, style = Textos.cuerpo.copy(color = colores.tinta)) }, onClick = { abierto = false; alElegir(valor) }, modifier = Modifier.heightIn(min = 44.dp))
            }
        }
    }
}

/** `.m-search-bar`: la píldora con la lupa, el campo y el botón de buscar. */
@Composable
fun BarraDeBusqueda(valor: String, alCambiar: (String) -> Unit, ejemplo: String, alBuscar: () -> Unit, buscando: Boolean, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(50)
    Row(
        modifier.fillMaxWidth().heightIn(min = 52.dp).clip(forma).background(colores.superficie)
            .border(1.dp, colores.contornoFuerte, forma).padding(start = Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e1),
    ) {
        Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario)
        BasicTextField(
            valor, alCambiar, Modifier.weight(1f),
            singleLine = true,
            textStyle = Textos.cuerpo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { alBuscar() }),
            decorationBox = { interior ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (valor.isEmpty()) Text(ejemplo, color = colores.tintaSuave, style = Textos.cuerpo, maxLines = 1)
                    interior()
                }
            },
        )
        BotonDeIcono(Iconos.arrowForward, "Buscar", alBuscar, habilitado = !buscando)
    }
}
