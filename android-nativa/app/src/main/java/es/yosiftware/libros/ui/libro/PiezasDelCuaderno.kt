package es.yosiftware.libros.ui.libro

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.componentes.rayaAbajo

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

/**
 * «Autoguardado sin pérdidas»: lo escrito se envía en el acto al pasar la app a segundo plano (`ON_STOP`) y al salir de
 * la vista, en el capítulo y en la ficha. [clave], el ViewModel que guarda.
 */
@Composable
internal fun GuardarAlSalir(clave: Any, guardar: () -> Unit) {
    val ciclo = LocalLifecycleOwner.current.lifecycle
    val guardarAhora by rememberUpdatedState(guardar)
    DisposableEffect(clave, ciclo) {
        val observador = LifecycleEventObserver { _, evento -> if (evento == Lifecycle.Event.ON_STOP) guardarAhora() }
        ciclo.addObserver(observador)
        onDispose {
            ciclo.removeObserver(observador)
            guardarAhora()
        }
    }
}

// --- La escena y la entrada: leídas enteras y, al tocarlas, abiertas para escribir. ---

/** El título de una escena o una entrada, leído o como campo: serif de 19 sp, en seminegrita. */
private val estiloDelTitulo = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.4.em)

/**
 * El fondo de la escena o la entrada abierta: el lienzo, con radio de 12 dp, que sobresale por los lados lo mismo que
 * su relleno (8 dp en el móvil, 16 desde 600 dp), así que el texto no se mueve al abrirla.
 */
internal fun Modifier.bloqueAbierto(lienzo: Color, compacto: Boolean): Modifier {
    val lado = if (compacto) Espacios.e2 else Espacios.e4
    return sobresalir(lado).clip(RoundedCornerShape(12.dp)).background(lienzo)
        .padding(horizontal = lado, vertical = if (compacto) Espacios.e3 else Espacios.e4)
}

/** El título leído: tocarlo abre el bloque para escribir ([accion], lo que anuncia el lector de pantalla). */
@Composable
internal fun TituloLeido(texto: String, accion: String, alPulsar: () -> Unit) {
    Text(
        texto,
        style = estiloDelTitulo.copy(color = LocalColores.current.tinta),
        modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClickLabel = accion, onClick = alPulsar).semantics { heading() },
    )
}

/** El texto leído entero, con sus enlaces: tocar fuera de ellos lo abre para escribir, con el cursor ahí. */
@Composable
internal fun TextoLeido(valor: String, enlaces: List<EnlaceNarrativo>, alAbrirEnlace: (EnlaceNarrativo) -> Unit, descripcion: String, alTocarParaEscribir: (Int) -> Unit) {
    EditorRtf(
        valor = valor, alCambiar = {}, modifier = Modifier.widthIn(max = 660.dp).fillMaxWidth(),
        enlaces = enlaces, alAbrirEnlace = alAbrirEnlace, descripcion = descripcion,
        soloLectura = true, alTocarParaEscribir = alTocarParaEscribir,
    )
}

/**
 * El título del bloque abierto: un campo en serif sobre una raya, sin caja. [porDefecto] («Escena N», «Descripción»)
 * se selecciona entero al entrar (`selectDefaultText`); [maximo], los caracteres que admite.
 */
@Composable
internal fun CampoDeTitulo(
    clave: Long, valor: String, alCambiar: (String) -> Unit, ejemplo: String, descripcion: String, porDefecto: String,
    modifier: Modifier, maximo: Int = Int.MAX_VALUE,
) {
    val colores = LocalColores.current
    var campo by remember(clave) { mutableStateOf(TextFieldValue(valor)) }
    if (campo.text != valor) campo = campo.copy(text = valor, selection = TextRange(minOf(campo.selection.start, valor.length), minOf(campo.selection.end, valor.length)))
    var enfocado by remember { mutableStateOf(false) }
    BasicTextField(
        value = campo,
        onValueChange = { nuevo ->
            val texto = nuevo.text.take(maximo)
            campo = nuevo.copy(text = texto)
            if (texto != valor) alCambiar(texto)
        },
        singleLine = true,
        textStyle = estiloDelTitulo.copy(color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        modifier = modifier
            .semantics { contentDescription = descripcion }
            .onFocusChanged { estado ->
                if (estado.isFocused && !enfocado && valor == porDefecto) campo = campo.copy(selection = TextRange(0, valor.length))
                enfocado = estado.isFocused
            },
        decorationBox = { interior ->
            Box(
                Modifier.fillMaxWidth().heightIn(min = 44.dp)
                    .rayaAbajo(if (enfocado) colores.primario else colores.contornoFuerte)
                    .padding(bottom = 4.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (valor.isEmpty()) Text(ejemplo, style = estiloDelTitulo.copy(color = colores.tintaSuave))
                interior()
            }
        },
    )
}

/** El «⋯» del bloque abierto, con [texto] («Eliminar la escena», «Eliminar la entrada») en rojo. */
@Composable
internal fun MenuDeEliminar(descripcion: String, texto: String, alEliminar: () -> Unit) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box {
        BotonDeIconoPequeno(Iconos.moreHoriz, descripcion, grande = true) { abierto = true }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
            DropdownMenuItem(
                text = { Text(texto, style = Textos.cuerpo.copy(color = colores.error)) },
                leadingIcon = { Icon(painterResource(Iconos.delete), contentDescription = null, tint = colores.error, modifier = Modifier.size(20.dp)) },
                onClick = { abierto = false; alEliminar() },
            )
        }
    }
}
