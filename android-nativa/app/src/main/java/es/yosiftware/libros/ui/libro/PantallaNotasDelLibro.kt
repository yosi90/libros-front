package es.yosiftware.libros.ui.libro

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.ui.catalogo.tituloH2
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Campo
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

/**
 * Las notas del libro (mobile-book-notes-view en 5dc3120): la cabecera con «Nueva», el formulario de crear o editar
 * arriba, el buscador desde cuatro notas y las tarjetas, con el borrado confirmado en la misma tarjeta. Hasta 900 dp de
 * ancho, centrado.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PantallaNotasDelLibro(libroId: Int, vm: NotasViewModel) {
    val colores = LocalColores.current
    LaunchedEffect(libroId) { vm.abrir(libroId) }
    val editor = vm.editor
    val alFormulario = remember { BringIntoViewRequester() }
    // Como `scrollMobileFormBlockIntoView`: al abrir el formulario, que se vea.
    LaunchedEffect(editor?.id, editor != null) { if (editor != null) alFormulario.bringIntoView() }
    Box(Modifier.fillMaxSize().background(colores.lienzo).verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.widthIn(max = 900.dp).fillMaxWidth().padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e4, bottom = Espacios.e8),
            verticalArrangement = Arrangement.spacedBy(Espacios.e3),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    TextoEyebrow("Tus apuntes")
                    Text("Notas", style = Textos.cuerpo.copy(fontSize = rem(1.5), lineHeight = 1.2.em, color = colores.tinta), modifier = Modifier.semantics { heading() })
                }
                Boton("Nueva", vm::crear, icono = Iconos.add)
            }
            if (editor != null) FormularioDeNota(vm, editor, Modifier.bringIntoViewRequester(alFormulario))
            if (vm.notas.size > 3) Campo(vm.consulta, { vm.consulta = it }, Modifier.fillMaxWidth(), ejemplo = "Buscar en tus notas", icono = Iconos.search)
            when {
                vm.cargando -> Estado { Text("Cargando notas…", style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center)) }
                vm.errorDeCarga != null -> Estado {
                    Icon(painterResource(Iconos.cloudOff), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(24.dp))
                    Text(vm.errorDeCarga.orEmpty(), style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center))
                    Boton("Reintentar", vm::cargarNotas, variante = VarianteDeBoton.Tonal)
                }
                vm.notas.isEmpty() && editor == null -> Estado {
                    Icon(painterResource(Iconos.stickyNote2), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(24.dp))
                    Text("Aún no tienes notas", style = tituloH2.copy(color = colores.tintaSuave, textAlign = TextAlign.Center))
                    Text("Apunta teorías, dudas o detalles de esta lectura.", style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center))
                }
                else -> vm.visibles.forEach { nota -> TarjetaDeNota(vm, nota) }
            }
        }
    }
}

/** .m-notes__state: centrado, en la tinta suave, con 24 × 16 dp de relleno y 8 dp entre piezas. */
@Composable
private fun Estado(contenido: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(horizontal = Espacios.e4, vertical = Espacios.e6),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) { contenido() }
}

@Composable
private fun FormularioDeNota(vm: NotasViewModel, editor: EditorDeNota, modifier: Modifier) {
    val colores = LocalColores.current
    Tarjeta(modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Text(editor.titulo, style = Textos.cuerpo.copy(fontSize = rem(1.1), fontWeight = FontWeight.Medium, lineHeight = 1.3.em, color = colores.tinta))
            CampoDeNota(
                "Título", editor.nombre, editor.avisoDeNombre,
                alCambiar = { vm.cambiar(editor.copy(nombre = it.take(100))) },
                alSalir = { vm.cambiar(editor.copy(nombreTocado = true)) },
            )
            CampoDeNota(
                "Nota", editor.descripcion, editor.avisoDeDescripcion,
                alCambiar = { vm.cambiar(editor.copy(descripcion = it)) },
                alSalir = { vm.cambiar(editor.copy(descripcionTocada = true)) },
                lineas = 6,
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
                Boton("Cancelar", vm::cancelar, variante = VarianteDeBoton.Contorno)
                Boton("Guardar", vm::guardar, habilitado = !vm.guardando)
            }
        }
    }
}

/**
 * .m-notes__field: la etiqueta (.8rem, 700, tinta suave) y el `input` o el `textarea` (`padding: 10px 12px`, superficie,
 * borde de 1 dp del contorno fuerte y radio pequeño), con el anillo de foco de 3 dp del primario al 42 % a 1 dp. El
 * `textarea` de 6 filas. Debajo, el aviso en el color de error.
 */
@Composable
private fun CampoDeNota(etiqueta: String, valor: String, aviso: String?, alCambiar: (String) -> Unit, alSalir: () -> Unit, lineas: Int = 1) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val interaccion = remember { MutableInteractionSource() }
    val enfocado by interaccion.collectIsFocusedAsState()
    val anillo = mezclar(colores.primario, 0.42f)
    val estilo = Textos.cuerpo.copy(color = colores.tinta)
    val tuvoFoco = remember { booleanArrayOf(false) }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(etiqueta, style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.Bold, color = colores.tintaSuave))
        BasicTextField(
            value = valor,
            onValueChange = alCambiar,
            singleLine = lineas == 1,
            minLines = lineas,
            textStyle = estilo,
            cursorBrush = SolidColor(colores.primario),
            interactionSource = interaccion,
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = etiqueta }.onFocusChanged {
                if (tuvoFoco[0] && !it.isFocused) alSalir()
                tuvoFoco[0] = it.isFocused
            },
            decorationBox = { campo ->
                Box(
                    Modifier.fillMaxWidth()
                        .drawBehind {
                            if (!enfocado) return@drawBehind
                            val fuera = 1.dp.toPx() + 1.5.dp.toPx()
                            drawRoundRect(
                                anillo, Offset(-fuera, -fuera), Size(size.width + 2 * fuera, size.height + 2 * fuera),
                                androidx.compose.ui.geometry.CornerRadius(Radios.sm.toPx() + fuera), style = Stroke(3.dp.toPx()),
                            )
                        }
                        .background(colores.superficie, forma).border(1.dp, colores.contornoFuerte, forma)
                        .padding(horizontal = 13.dp, vertical = 11.dp),
                ) { campo() }
            },
        )
        if (aviso != null) Text(aviso, style = Textos.cuerpo.copy(fontSize = rem(0.78), color = colores.error))
    }
}

/** .m-note: el título (1rem) con su fecha (.75rem), editar y borrar, el texto con sus saltos y, si se pidió, la confirmación. */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun TarjetaDeNota(vm: NotasViewModel, nota: es.yosiftware.libros.datos.modelos.Nota) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(nota.nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Medium, lineHeight = 1.4.em, color = colores.tinta))
                    NotasDelLibro.fecha(nota)?.let { Text(it, style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.tintaSuave)) }
                }
                BotonDeIcono(Iconos.edit, "Editar ${nota.nombre}", { vm.editar(nota) })
                BotonDeIcono(Iconos.delete, "Eliminar ${nota.nombre}", { vm.pedirBorrar(nota) })
            }
            Text(NotasDelLibro.texto(nota), style = Textos.cuerpo.copy(lineHeight = 1.55.em, color = colores.tinta))
            if (vm.porBorrar == nota.id) {
                FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2), itemVerticalAlignment = Alignment.CenterVertically) {
                    Text("¿Eliminar esta nota?", style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), modifier = Modifier.fillMaxWidth())
                    Boton("No", vm::noBorrar, variante = VarianteDeBoton.Contorno)
                    Boton("Eliminar", vm::borrar, habilitado = !vm.borrando)
                }
            }
        }
    }
}
