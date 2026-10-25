package es.yosiftware.libros.ui.editor

import android.util.TypedValue
import android.view.View
import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import es.yosiftware.libros.datos.rtf.Alineacion
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo
import es.yosiftware.libros.datos.rtf.FUENTE_POR_DEFECTO
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import kotlin.math.roundToInt

/** Las fuentes de la barra (`NARRATIVE_EDITOR_SYSTEM_FONTS` y `NARRATIVE_EDITOR_GOOGLE_FONTS`). */
private val fuentesNormales = listOf("Arial", "Calibri", "Courier New", "Georgia", "Microsoft Sans Serif", "Times New Roman")
private val googleFonts = listOf("Cinzel Decorative", "Lato", "Luckiest Guy", "MedievalSharp", "Merriweather", "Montserrat", "Open Sans", "Playfair Display", "Roboto")
private val tamanos = listOf(6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72, 96)
private val colores = listOf("#F6E6C9", "#F5DEB3", "#FFFFFF", "#D9A956", "#4F9D8D", "#5E8FC4", "#B85C5C", "#000000")
private val interlineados = listOf(1.0 to "1", 1.15 to "1,15", 1.5 to "1,5", 2.0 to "2")

/**
 * El editor del texto narrativo (narrative-rtf-editor en la vista móvil de 5dc3120): la barra (fuente, tamaño, negrita,
 * cursiva, subrayado, tachado, color, resaltado, alineación, sangría y las opciones de párrafo), desplazable de lado, y
 * debajo el texto. Edita RTF y devuelve RTF ([alCambiar]); si no se toca, el valor no se reescribe.
 *
 * TODO(clon): el color personalizado de los menús de color (`input type=color`), deshacer y rehacer (en la web, con el
 * teclado) y recordar la última fuente por libro (`NarrativeEditorFontPreferenceService`).
 */
@Composable
fun EditorRtf(
    valor: String,
    alCambiar: (String) -> Unit,
    modifier: Modifier = Modifier,
    enlaces: List<EnlaceNarrativo> = emptyList(),
    alAbrirEnlace: (EnlaceNarrativo) -> Unit = {},
    descripcion: String = "Texto narrativo",
    seleccionarTodoAlEnfocar: Boolean = false,
    alTerminarDeEditar: () -> Unit = {},
) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    val oscuro = colores.oscuro
    val pintura = remember(colores, oscuro) { PinturaRtf(colores.tinta.toArgb(), colores.primario.toArgb(), oscuro, contexto.resources.displayMetrics) }
    val cambiar by rememberUpdatedState(alCambiar)
    val terminar by rememberUpdatedState(alTerminarDeEditar)
    var campo by remember { mutableStateOf<CampoRtf?>(null) }
    var barra by remember { mutableStateOf(EstadoDeLaBarra()) }
    var enfocado by remember { mutableStateOf(false) }
    val anillo = mezclar(colores.primario, 0.42f)
    Column(modifier, horizontalAlignment = Alignment.End) {
        Barra(barra, campo)
        val forma = RoundedCornerShape(topStart = 7.dp, topEnd = 0.dp, bottomEnd = 7.dp, bottomStart = 7.dp)
        Box(
            Modifier.fillMaxWidth()
                .drawBehind {
                    if (!enfocado) return@drawBehind
                    val fuera = 2.dp.toPx() + 1.5.dp.toPx()
                    drawRoundRect(anillo, Offset(-fuera, -fuera), Size(size.width + 2 * fuera, size.height + 2 * fuera), CornerRadius(7.dp.toPx() + fuera), style = Stroke(3.dp.toPx()))
                }
                .clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)
                .heightIn(min = 118.dp),
        ) {
            AndroidView(
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = descripcion },
                factory = { context ->
                    CampoRtf(context, pintura).apply {
                        val dp = { valor: Float -> TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, valor, resources.displayMetrics).roundToInt() }
                        setPadding(dp(14f), dp(12f), dp(14f), dp(12f))
                        minHeight = dp(118f)
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                        // El `line-height` de 1,5 de la web: Roboto mide 1,17 veces su tamaño, así que 1,5 / 1,17.
                        setLineSpacing(0f, 1.28f)
                        setTextColor(colores.tinta.toArgb())
                        highlightColor = mezclar(colores.primario, 0.3f).toArgb()
                        setSelectAllOnFocus(seleccionarTodoAlEnfocar)
                        var tocadoDesdeElFoco = false
                        onFocusChangeListener = View.OnFocusChangeListener { _, foco ->
                            enfocado = foco
                            if (!foco && tocadoDesdeElFoco) terminar()
                            tocadoDesdeElFoco = false
                        }
                        this.alCambiar = { nuevo ->
                            tocadoDesdeElFoco = true
                            cambiar(nuevo)
                        }
                        alCambiarLaBarra = { barra = it }
                        cargar(valor, enlaces)
                        campo = this
                    }
                },
                update = { vista ->
                    vista.alAbrirEnlace = alAbrirEnlace
                    vista.cambiarPintura(pintura)
                    vista.setSelectAllOnFocus(seleccionarTodoAlEnfocar)
                    // Como la web: mientras se escribe, lo que llega de fuera no pisa el texto.
                    if (!vista.hasFocus()) vista.cargar(valor, enlaces)
                },
            )
        }
    }
}

/** `.rtf-toolbar` en móvil: sobre la superficie contenedora, con borde y sin el de abajo, desplazable de lado. */
@Composable
private fun Barra(estado: EstadoDeLaBarra, campo: CampoRtf?) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(topStart = 7.dp, topEnd = 7.dp)
    Row(
        Modifier.clip(forma).background(colores.superficieContenedor)
            .drawBehind {
                val ancho = 1.dp.toPx()
                drawRect(colores.contorno, Offset.Zero, Size(size.width, ancho))
                drawRect(colores.contorno, Offset.Zero, Size(ancho, size.height))
                drawRect(colores.contorno, Offset(size.width - ancho, 0f), Size(ancho, size.height))
            }
            .horizontalScroll(rememberScrollState())
            .padding(2.dp),
        horizontalArrangement = Arrangement.spacedBy(1.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Grupo {
            SelectorDeFuente(estado.fuente ?: FUENTE_POR_DEFECTO) { fuente -> campo?.cambiarLetra { it.copy(fuente = fuente) } }
            SelectorDeTamano(estado.mediosPuntos) { puntos -> campo?.cambiarLetra { it.copy(tamano = puntos * 2) } }
        }
        Grupo {
            Herramienta(Iconos.formatBold, "Negrita", estado.negrita) { campo?.let { c -> val poner = !c.seleccionCumple { it.negrita }; c.cambiarLetra { it.copy(negrita = poner) } } }
            Herramienta(Iconos.formatItalic, "Cursiva", estado.cursiva) { campo?.let { c -> val poner = !c.seleccionCumple { it.cursiva }; c.cambiarLetra { it.copy(cursiva = poner) } } }
            Herramienta(Iconos.formatUnderlined, "Subrayado", estado.subrayado) { campo?.let { c -> val poner = !c.seleccionCumple { it.subrayado }; c.cambiarLetra { it.copy(subrayado = poner) } } }
            Herramienta(Iconos.strikethroughS, "Tachado", estado.tachado) { campo?.let { c -> val poner = !c.seleccionCumple { it.tachado }; c.cambiarLetra { it.copy(tachado = poner) } } }
        }
        Grupo {
            MenuDeColor(Iconos.formatColorText, "Color del texto", "Color de texto") { color -> campo?.cambiarLetra { it.copy(color = color) } }
            MenuDeColor(Iconos.formatColorFill, "Color de resaltado", "Resaltado") { color -> campo?.cambiarLetra { it.copy(resaltado = color) } }
        }
        Grupo {
            listOf(
                Triple(Alineacion.IZQUIERDA, Iconos.formatAlignLeft, "Alinear a la izquierda"),
                Triple(Alineacion.CENTRO, Iconos.formatAlignCenter, "Centrar"),
                Triple(Alineacion.DERECHA, Iconos.formatAlignRight, "Alinear a la derecha"),
                Triple(Alineacion.JUSTIFICADO, Iconos.formatAlignJustify, "Justificar"),
            ).forEach { (alineacion, icono, nombre) ->
                Herramienta(icono, nombre, estado.parrafo.alineacion == alineacion) { campo?.cambiarParrafos { it.copy(alineacion = alineacion) } }
            }
            Herramienta(Iconos.formatIndentDecrease, "Reducir sangría", false) { campo?.cambiarParrafos { it.copy(sangriaIzquierda = maxOf(0, it.sangriaIzquierda - 720)) } }
            Herramienta(Iconos.formatIndentIncrease, "Aumentar sangría", false) { campo?.cambiarParrafos { it.copy(sangriaIzquierda = it.sangriaIzquierda + 720) } }
        }
        MenuDeParrafo(estado.parrafo) { cambio -> campo?.cambiarParrafos(cambio) }
    }
}

/** `.rtf-toolbar__group`: separado del siguiente por una raya de 1 dp, con 4 dp antes. */
@Composable
private fun Grupo(contenido: @Composable () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.drawBehind { drawRect(colores.contorno, Offset(size.width - 1.dp.toPx(), 0f), Size(1.dp.toPx(), size.height)) }.padding(end = 5.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) { contenido() }
}

/** `.rtf-tool` en móvil: 28 dp, en la tinta suave; activa, sobre el primario. El icono, de 13 dp. */
@Composable
private fun Herramienta(@DrawableRes icono: Int, nombre: String, activa: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(6.dp)
    Box(
        Modifier.size(28.dp).clip(forma)
            .background(if (activa) colores.primario else colores.superficie)
            .border(1.dp, if (activa) colores.primario else Color.Transparent, forma)
            .clickable(onClick = alPulsar)
            .semantics { contentDescription = nombre; selected = activa },
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = if (activa) colores.sobrePrimario else colores.tintaSuave, modifier = Modifier.size(13.dp))
    }
}

/** `.rtf-font-select` en móvil: 28 dp de alto, borde del contorno, texto de 8 dp y la flecha. */
@Composable
private fun Selector(texto: String, ancho: Int, descripcion: String, menu: @Composable (cerrar: () -> Unit) -> Unit) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    val forma = RoundedCornerShape(5.dp)
    Box {
        Row(
            Modifier.width(ancho.dp).height(28.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)
                .clickable { abierto = true }.padding(start = 7.dp, end = 2.dp)
                .semantics { contentDescription = descripcion },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(texto, style = Textos.cuerpo.copy(fontSize = 8.sp, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Icon(painterResource(Iconos.arrowDropDown), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(16.dp))
        }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficieContenedor) { menu { abierto = false } }
    }
}

@Composable
private fun SelectorDeFuente(fuente: String, alElegir: (String) -> Unit) {
    val colores = LocalColores.current
    Selector(fuente, 82, "Fuente") { cerrar ->
        listOf("Fuentes normales" to fuentesNormales, "Google Fonts" to googleFonts).forEach { (grupo, fuentes) ->
            Text(grupo, style = Textos.cuerpo.copy(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colores.primario), modifier = Modifier.background(colores.superficie).fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp))
            fuentes.forEach { nombre ->
                DropdownMenuItem(
                    text = { Text(nombre, style = Textos.cuerpo.copy(fontSize = 12.sp, fontFamily = androidx.compose.ui.text.font.FontFamily(FamiliasRtf.tipo(nombre, false, false)), color = colores.tinta)) },
                    onClick = { cerrar(); alElegir(nombre) },
                )
            }
        }
    }
}

@Composable
private fun SelectorDeTamano(mediosPuntos: Int, alElegir: (Int) -> Unit) {
    val colores = LocalColores.current
    // El tamaño del texto aunque no esté en la lista (10,5 pt de RichEdit, por ejemplo).
    val texto = if (mediosPuntos % 2 == 0) (mediosPuntos / 2).toString() else "${mediosPuntos / 2},5"
    Selector(texto, 48, "Tamaños habituales") { cerrar ->
        tamanos.forEach { tamano ->
            DropdownMenuItem(text = { Text(tamano.toString(), style = Textos.cuerpo.copy(fontSize = 12.sp, color = colores.tinta)) }, onClick = { cerrar(); alElegir(tamano) })
        }
    }
}

/** `.rtf-color` y su panel: los ocho colores de la barra en cuatro columnas. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MenuDeColor(@DrawableRes icono: Int, nombre: String, prefijo: String, alElegir: (String) -> Unit) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box {
        Herramienta(icono, nombre, false) { abierto = true }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
            FlowRow(Modifier.width(156.dp).padding(9.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), maxItemsInEachRow = 4) {
                es.yosiftware.libros.ui.editor.colores.forEach { hex ->
                    val forma = RoundedCornerShape(5.dp)
                    Box(
                        Modifier.size(24.dp).clip(forma).background(Color(LetraSpan.colorDe(hex))).border(1.dp, Color.White.copy(alpha = 0.34f), forma)
                            .clickable { abierto = false; alElegir(hex) }
                            .semantics { contentDescription = "$prefijo $hex" },
                    )
                }
            }
        }
    }
}

/** `.rtf-paragraph-menu`: las sangrías y los espacios en puntos, y el interlineado. */
@Composable
private fun MenuDeParrafo(parrafo: EstiloDeParrafo, alCambiar: ((EstiloDeParrafo) -> EstiloDeParrafo) -> Unit) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box {
        Herramienta(Iconos.formatLineSpacing, "Opciones de párrafo", false) { abierto = true }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
            Column(Modifier.widthIn(max = 270.dp).padding(10.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                val medidas = listOf(
                    Triple("Izquierda (pt)", parrafo.sangriaIzquierda, 0) to { e: EstiloDeParrafo, t: Int -> e.copy(sangriaIzquierda = t) },
                    Triple("Derecha (pt)", parrafo.sangriaDerecha, 0) to { e: EstiloDeParrafo, t: Int -> e.copy(sangriaDerecha = t) },
                    Triple("Primera línea (pt)", parrafo.sangriaPrimeraLinea, -144) to { e: EstiloDeParrafo, t: Int -> e.copy(sangriaPrimeraLinea = t) },
                    Triple("Antes (pt)", parrafo.espacioAntes, 0) to { e: EstiloDeParrafo, t: Int -> e.copy(espacioAntes = t) },
                    Triple("Después (pt)", parrafo.espacioDespues, 0) to { e: EstiloDeParrafo, t: Int -> e.copy(espacioDespues = t) },
                )
                medidas.chunked(2).forEach { fila ->
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        fila.forEach { (datos, aplicar) ->
                            val (etiqueta, twips, minimo) = datos
                            CampoDeMedida(etiqueta, twips / 20, Modifier.width(112.dp)) { puntos ->
                                // `applyParagraphMetric`: entre el mínimo y 720 pt, en twips.
                                alCambiar { aplicar(it, (puntos.coerceIn(minimo, 720) * 20)) }
                            }
                        }
                    }
                }
                Text("Interlineado", style = Textos.cuerpo.copy(fontSize = 11.sp, color = colores.tintaSuave))
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    interlineados.forEach { (multiplo, texto) ->
                        val activo = parrafo.interlineadoMultiple && parrafo.interlineado == (multiplo * 240).roundToInt() || (!parrafo.interlineadoMultiple && parrafo.interlineado == 0 && multiplo == 1.0)
                        Box(
                            Modifier.height(28.dp).clip(RoundedCornerShape(5.dp)).background(if (activo) colores.primario else colores.superficie).border(1.dp, colores.contorno, RoundedCornerShape(5.dp))
                                .clickable { alCambiar { it.copy(interlineado = (multiplo * 240).roundToInt(), interlineadoMultiple = true) } }.padding(horizontal = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(texto, style = Textos.cuerpo.copy(fontSize = 11.sp, color = if (activo) colores.sobrePrimario else colores.tinta)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun CampoDeMedida(etiqueta: String, puntos: Int, modifier: Modifier, alCambiar: (Int) -> Unit) {
    val colores = LocalColores.current
    var texto by remember(puntos) { mutableStateOf(puntos.toString()) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(etiqueta, style = Textos.cuerpo.copy(fontSize = 11.sp, color = colores.tintaSuave))
        BasicTextField(
            value = texto,
            onValueChange = { nuevo ->
                texto = nuevo.filter { it.isDigit() || it == '-' }
                texto.toIntOrNull()?.let(alCambiar)
            },
            singleLine = true,
            textStyle = Textos.cuerpo.copy(fontSize = 12.sp, color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            decorationBox = { campo ->
                Box(Modifier.fillMaxWidth().height(28.dp).clip(RoundedCornerShape(5.dp)).background(colores.superficie).border(1.dp, colores.contorno, RoundedCornerShape(5.dp)).padding(horizontal = 6.dp), contentAlignment = Alignment.CenterStart) { campo() }
            },
        )
    }
}
