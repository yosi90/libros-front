package es.yosiftware.libros.ui.libro

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.datos.modelos.Nota
import es.yosiftware.libros.ui.adaptable.ClaseDeVentana
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Campo
import es.yosiftware.libros.ui.componentes.ListaVacia
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.componentes.rayaArriba
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar

private val estiloDelTitulo = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.35.em)
private val estiloDelTexto = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 16.sp, lineHeight = 1.62.em)

/**
 * Las notas del libro («Cuaderno», F5, el clon de la F4 de la web): el compositor siempre arriba, que se guarda solo
 * ([NotasViewModel]); debajo, las notas en una columna de 736 dp como mucho, con el buscador desde cuatro. Tocar una
 * la lleva al compositor; «⋯» la elimina, tras confirmarlo en la misma nota. Mientras cargan, su silueta; si fallan,
 * «Reintentar».
 */
@Composable
fun PantallaNotasDelLibro(libroId: Int, vm: NotasViewModel) {
    val colores = LocalColores.current
    LaunchedEffect(libroId) { vm.abrir(libroId) }
    GuardarAlSalir(vm) { vm.guardarAhora() }
    val compacta = LocalVentana.current.clase == ClaseDeVentana.Compacta
    val scroll = rememberScrollState()
    val alTexto = remember { FocusRequester() }
    val alTitulo = remember { FocusRequester() }
    // A dónde llevar el foco tras cargar una nota en el compositor (arriba del todo).
    var enfocar by remember { mutableStateOf<FocusRequester?>(null) }
    LaunchedEffect(enfocar) {
        val destino = enfocar ?: return@LaunchedEffect
        scroll.animateScrollTo(0)
        runCatching { destino.requestFocus() }
        enfocar = null
    }
    Box(Modifier.fillMaxSize().background(colores.lienzo).verticalScroll(scroll), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.widthIn(max = 736.dp).fillMaxWidth()
                .padding(horizontal = if (compacta) Espacios.e4 else 28.dp, vertical = if (compacta) Espacios.e4 else 32.dp)
                .padding(bottom = Espacios.e6),
        ) {
            Compositor(vm, alTitulo, alTexto, alNotaNueva = { if (vm.notaNueva()) enfocar = alTitulo })
            when {
                vm.cargando -> Column(Modifier.padding(top = 28.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) { repeat(3) { Silueta() } }
                vm.errorDeCarga != null -> Column(Modifier.padding(top = 28.dp), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                    Text(vm.errorDeCarga.orEmpty(), style = Textos.cuerpo.copy(color = colores.tintaSuave))
                    Boton("Reintentar", vm::cargarNotas, variante = VarianteDeBoton.Contorno)
                }
                vm.notas.isNotEmpty() -> {
                    if (vm.notas.size > 3) {
                        // La lupa sola (ronda 1 de interfaz, opción A): lo que busca va en su nombre accesible.
                        Campo(vm.consulta, { vm.consulta = it }, Modifier.fillMaxWidth().padding(top = Espacios.e5, bottom = 4.dp), icono = Iconos.search, descripcion = "Buscar en tus notas")
                    }
                    val listadas = vm.listadas
                    listadas.forEachIndexed { i, nota ->
                        NotaLeida(vm, nota, raya = i > 0 || vm.notas.size <= 3, alEditar = { if (vm.editar(nota)) enfocar = alTexto })
                    }
                    if (listadas.isEmpty() && vm.consulta.isNotBlank()) ListaVacia("Sin coincidencias")
                }
            }
        }
    }
}

/**
 * El compositor: el título y el texto en serif, sin cajas, dentro de un marco que se resalta al escribir. Debajo, el
 * estado del guardado y, si se edita una nota, el + de la nota nueva. Salir de él (no a su otro campo) guarda lo pendiente y,
 * si ya estaba guardada, lo vacía.
 */
@Composable
private fun Compositor(vm: NotasViewModel, alTitulo: FocusRequester, alTexto: FocusRequester, alNotaNueva: () -> Unit) {
    val colores = LocalColores.current
    val editor = vm.compositor
    var dentro by remember { mutableStateOf(false) }
    val forma = RoundedCornerShape(16.dp)
    Column(
        Modifier.fillMaxWidth()
            .drawBehind {
                if (!dentro) return@drawBehind
                val fuera = 3.dp.toPx()
                drawRoundRect(
                    mezclar(colores.primario, 0.18f), androidx.compose.ui.geometry.Offset(-fuera, -fuera),
                    androidx.compose.ui.geometry.Size(size.width + 2 * fuera, size.height + 2 * fuera),
                    androidx.compose.ui.geometry.CornerRadius(16.dp.toPx() + fuera),
                )
            }
            .clip(forma).background(colores.superficie).border(1.dp, if (dentro) colores.primario else colores.contornoFuerte, forma)
            .onFocusChanged { estado ->
                if (dentro && !estado.hasFocus) vm.salirDelCompositor()
                dentro = estado.hasFocus
            }
            .semantics { contentDescription = if (editor.id != null) "Editar la nota" else "Nueva nota" },
    ) {
        CampoDelCompositor(
            editor.nombre, "Título", "Título de la nota", estiloDelTitulo, alTitulo,
            Modifier.padding(start = 14.dp, end = 14.dp, top = Espacios.e3, bottom = 4.dp), unaLinea = true,
        ) { vm.cambiar(editor.copy(nombre = it.take(100))) }
        CampoDelCompositor(
            editor.descripcion, "Lo que quieras recordar de esta lectura", "Texto de la nota", estiloDelTexto, alTexto,
            Modifier.padding(start = 14.dp, end = 14.dp, bottom = Espacios.e3).heightIn(min = 76.dp), unaLinea = false,
        ) { vm.cambiar(editor.copy(descripcion = it)) }
        if (vm.estado != EstadoDelGuardado.NADA || editor.id != null) {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 32.dp).padding(start = Espacios.e3, end = Espacios.e2, bottom = Espacios.e1),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (vm.estado != EstadoDelGuardado.NADA) IndicadorDeGuardado(vm.estado, vm.textoDelEstado)
                // Solo el +, con su nombre (ronda 1 de interfaz, opción A): deja la nota y empieza otra.
                if (editor.id != null) BotonDeIcono(Iconos.add, "Nueva nota", alNotaNueva, color = colores.primario)
            }
        }
    }
}

@Composable
private fun CampoDelCompositor(
    valor: String, ejemplo: String, descripcion: String, estilo: androidx.compose.ui.text.TextStyle, foco: FocusRequester,
    modifier: Modifier, unaLinea: Boolean, alCambiar: (String) -> Unit,
) {
    val colores = LocalColores.current
    BasicTextField(
        value = valor,
        onValueChange = alCambiar,
        singleLine = unaLinea,
        textStyle = estilo.copy(color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
        modifier = Modifier.fillMaxWidth().focusRequester(foco).semantics { contentDescription = descripcion },
        decorationBox = { interior ->
            Box(modifier.fillMaxWidth()) {
                if (valor.isEmpty()) Text(ejemplo, style = estilo.copy(color = colores.tintaSuave))
                interior()
            }
        },
    )
}

/**
 * Una nota: su título en serif con la fecha y «⋯» (eliminar), y su texto entero; tocarla la lleva al compositor. Si se
 * pidió eliminarla, la confirmación en la misma nota.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun NotaLeida(vm: NotasViewModel, nota: Nota, raya: Boolean, alEditar: () -> Unit) {
    val colores = LocalColores.current
    Column(Modifier.fillMaxWidth().padding(top = if (raya) 0.dp else Espacios.e3).then(if (raya) Modifier.rayaArriba(colores.contorno) else Modifier).padding(vertical = 18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Text(
                nota.nombre, style = estiloDelTitulo.copy(color = colores.tinta),
                modifier = Modifier.weight(1f).clickable(role = Role.Button, onClickLabel = "Editar la nota ${nota.nombre}", onClick = alEditar).semantics { heading() },
            )
            NotasDelLibro.fecha(nota)?.let { Text(it, style = Textos.cuerpo.copy(fontSize = 12.5.sp, color = colores.tintaSuave)) }
            MenuDeEliminar("Más: eliminar «${nota.nombre}»", "Eliminar la nota") { vm.pedirBorrar(nota) }
        }
        Text(
            NotasDelLibro.texto(nota), style = estiloDelTexto.copy(color = colores.tinta),
            modifier = Modifier.padding(top = 4.dp).widthIn(max = 620.dp).clickable(role = Role.Button, onClickLabel = "Editar la nota", onClick = alEditar),
        )
        if (vm.porBorrar == nota.id) {
            FlowRow(
                Modifier.padding(top = Espacios.e3).fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(colores.lienzo)
                    .border(1.dp, colores.contorno, RoundedCornerShape(8.dp)).padding(horizontal = Espacios.e3, vertical = Espacios.e2),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                verticalArrangement = Arrangement.spacedBy(Espacios.e2),
            ) {
                Text("¿Eliminar esta nota?", style = Textos.cuerpo.copy(fontSize = 14.sp, color = colores.tinta), modifier = Modifier.align(Alignment.CenterVertically))
                Boton("Cancelar", vm::noBorrar, variante = VarianteDeBoton.Contorno)
                Boton("Eliminar", vm::borrar, habilitado = !vm.borrando)
            }
        }
    }
}

/** La silueta de una nota mientras carga: un título y dos líneas, que laten. */
@Composable
private fun Silueta() {
    val colores = LocalColores.current
    val latido by rememberInfiniteTransition(label = "silueta").animateFloat(1f, 0.55f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "latido")
    Column(Modifier.fillMaxWidth().alpha(latido).semantics { contentDescription = "Cargando notas" }, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Raya(0.4f, 16.dp, colores.superficieContenedor)
        Raya(1f, 12.dp, colores.superficieContenedor)
        Raya(0.7f, 12.dp, colores.superficieContenedor)
    }
}

@Composable
private fun Raya(ancho: Float, alto: Dp, color: androidx.compose.ui.graphics.Color) {
    Box(Modifier.fillMaxWidth(ancho).height(alto).clip(RoundedCornerShape(6.dp)).background(color))
}
