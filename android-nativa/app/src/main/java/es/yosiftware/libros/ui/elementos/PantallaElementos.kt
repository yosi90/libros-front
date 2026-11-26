package es.yosiftware.libros.ui.elementos

import androidx.annotation.DrawableRes
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.ui.adaptable.ClaseDeVentana
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.libro.BotonDeIconoPequeno
import es.yosiftware.libros.ui.libro.BotonDeTexto
import es.yosiftware.libros.ui.libro.Elemento
import es.yosiftware.libros.ui.libro.EstadoDelGuardado
import es.yosiftware.libros.ui.libro.IndicadorDeGuardado
import es.yosiftware.libros.ui.libro.LibroViewModel
import es.yosiftware.libros.ui.libro.VistaDelLibro
import es.yosiftware.libros.ui.libro.enlacesDe
import es.yosiftware.libros.ui.libro.sobresalir
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos

/** El icono de cada tipo (`entityToolbarActions`). */
fun iconoDe(elemento: Elemento): Int = when (elemento) {
    Elemento.PERSONAJES -> Iconos.coPresent
    Elemento.ORGANIZACIONES -> Iconos.groups
    Elemento.EVENTOS -> Iconos.event
    Elemento.LOCALIZACIONES -> Iconos.myLocation
    Elemento.CONCEPTOS -> Iconos.autoAwesome
    Elemento.CITAS -> Iconos.formatQuote
}

/** «Nuevo personaje», «Nueva organización»… */
private fun nuevo(tipo: Elemento) = "${if (tipo.femenino) "Nueva" else "Nuevo"} ${tipo.singular}"

/** El radio de las filas, los bloques y las cajas pequeñas (`--web-radius-md`). */
private val radioMedio = RoundedCornerShape(8.dp)

/**
 * Elementos («Cuaderno», F5, el clon de la F3 de la web): la lista del tipo y, desde 600 dp, su ficha al lado; en el
 * móvil, la lista y, al tocar, la ficha. La ficha se edita en el sitio y se guarda sola ([ElementosViewModel]): el nombre
 * al salir del campo (en personajes, eligiendo si se llama así desde este libro o estaba mal escrito), lo demás al
 * cambiarlo. Las entradas se leen enteras y se escribe en una a la vez. El alta rápida es una hoja con lo mínimo. Al
 * pasar a segundo plano o salir de la vista, se guarda en el acto.
 */
@Composable
fun PantallaElementos(libroVm: LibroViewModel, vista: VistaDelLibro.DeElemento, vm: ElementosViewModel) {
    val colores = LocalColores.current
    val libro = libroVm.libro ?: return
    LaunchedEffect(libro, vista) { vm.abrir(libro, vista) }
    vm.alGuardar = libroVm::recibirLibro
    val ciclo = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(vm, ciclo) {
        val observador = LifecycleEventObserver { _, evento -> if (evento == Lifecycle.Event.ON_STOP) vm.guardarAhora() }
        ciclo.addObserver(observador)
        onDispose {
            ciclo.removeObserver(observador)
            vm.guardarAhora()
        }
    }
    val clase = LocalVentana.current.clase
    val aLaVez = clase != ClaseDeVentana.Compacta
    val tipo = vista.elemento
    val ficha = vm.ficha.takeIf { vm.modo is ModoDeElementos.Ficha }
    var buscado by rememberSaveable(tipo) { mutableStateOf("") }
    // En el móvil, Atrás en la ficha vuelve a la lista (guardando antes); la hoja de alta se cierra sola.
    BackHandler(enabled = !aLaVez && ficha != null) { vm.volver() }
    if (aLaVez) {
        Row(Modifier.fillMaxSize()) {
            Lista(vm, libro, tipo, buscado, { buscado = it }, Modifier.width(if (clase == ClaseDeVentana.Expandida) 320.dp else 312.dp).fillMaxHeight())
            Box(Modifier.width(1.dp).fillMaxHeight().background(colores.contorno))
            Box(Modifier.weight(1f).fillMaxHeight().background(colores.superficie)) {
                if (ficha != null) Ficha(libroVm, vm, libro, ficha, conVolver = false)
                else Text("Elige uno de la lista.", style = Textos.cuerpo.copy(color = colores.tintaSuave), modifier = Modifier.padding(horizontal = 40.dp, vertical = 48.dp))
            }
        }
    } else if (ficha != null) {
        Ficha(libroVm, vm, libro, ficha, conVolver = true)
    } else {
        Lista(vm, libro, tipo, buscado, { buscado = it }, Modifier.fillMaxSize())
    }
    HojaDeAlta(vm, libro, tipo)
    vm.nombreRepetido?.let { nombre ->
        AlertDialog(
            onDismissRequest = { vm.confirmarNombreRepetido(false) },
            text = { Text("Ya hay un personaje llamado «$nombre» en este libro. ¿Quieres crear otro con el mismo nombre?", style = Textos.cuerpo.copy(color = colores.tinta)) },
            confirmButton = { TextButton(onClick = { vm.confirmarNombreRepetido(true) }) { Text("Crear otro") } },
            dismissButton = { TextButton(onClick = { vm.confirmarNombreRepetido(false) }) { Text("Cancelar") } },
            containerColor = colores.superficie,
        )
    }
}

// --- La lista. ---

/**
 * La lista del tipo, sobre el lienzo: arriba, fijos, el buscador y «Nuevo»; debajo, las filas agrupadas como las manda
 * el servidor ([ListaDeElementos.grupos]). En personajes, junto al nombre, en cuántos capítulos salen.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun Lista(vm: ElementosViewModel, libro: Libro, tipo: Elemento, buscado: String, alBuscar: (String) -> Unit, modifier: Modifier) {
    val colores = LocalColores.current
    val grupos = remember(libro, tipo, buscado) { ListaDeElementos.grupos(libro, tipo, buscado) }
    val apariciones = remember(libro, tipo) { if (tipo == Elemento.PERSONAJES) ListaDeElementos.apariciones(libro) else emptyMap() }
    val elegido = (vm.modo as? ModoDeElementos.Ficha)?.id
    LazyColumn(modifier.background(colores.lienzo), contentPadding = PaddingValues(bottom = Espacios.e5)) {
        stickyHeader(key = "arriba") {
            Row(
                Modifier.fillMaxWidth().background(colores.lienzo).padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e3, bottom = Espacios.e1),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Buscador(buscado, "Buscar", "Buscar en ${tipo.etiqueta.lowercase()}", alBuscar, Modifier.weight(1f))
                BotonNuevo(nuevo(tipo)) { vm.abrirAlta() }
            }
        }
        if (grupos.isEmpty()) item(key = "vacia") {
            Column(Modifier.padding(horizontal = 20.dp, vertical = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                if (buscado.isNotBlank()) Text("Nada coincide con «${buscado.trim()}».", style = Textos.cuerpo.copy(color = colores.tintaSuave))
                else {
                    Text("Aún no hay ${tipo.etiqueta.lowercase()}.", style = Textos.cuerpo.copy(color = colores.tintaSuave))
                    Boton(nuevo(tipo), { vm.abrirAlta() }, icono = Iconos.add)
                }
            }
        }
        grupos.forEach { grupo ->
            if (grupo.etiqueta.isNotEmpty()) item(key = "g:${grupo.etiqueta}") {
                Text(grupo.etiqueta, style = Textos.cuerpo.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.3.em, color = colores.tintaSuave), modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 4.dp))
            }
            items(grupo.elementos, key = { "${grupo.etiqueta}:${it.id}" }) { e ->
                FilaDeLista(e.nombre, ListaDeElementos.detalle(e, tipo, apariciones[e.id]?.size ?: 0), e.id == elegido) { vm.cambiarA(e.id) }
            }
        }
    }
}

/** `.list__item`: el nombre en serif y su detalle; la del elemento abierto, con el fondo del primario. */
@Composable
private fun FilaDeLista(nombre: String, detalle: String, activa: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.padding(horizontal = Espacios.e2).fillMaxWidth().heightIn(min = 44.dp).clip(radioMedio)
            .background(if (activa) colores.contenedorPrimario else Color.Transparent)
            .clickable(role = Role.Button, onClick = alPulsar).semantics { selected = activa }
            .padding(horizontal = Espacios.e3, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            nombre,
            style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 16.sp, fontWeight = if (activa) FontWeight.SemiBold else FontWeight.Medium, lineHeight = 1.3.em, color = colores.tinta),
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
        )
        if (detalle.isNotEmpty()) Text(detalle, style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.2.em, color = colores.tintaSuave, fontFeatureSettings = "tnum"), maxLines = 1)
    }
}

/** «+ Nuevo»: la píldora pequeña del primario. */
@Composable
private fun BotonNuevo(descripcion: String, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.heightIn(min = 40.dp).clip(Radios.pildora).background(colores.primario)
            .clickable(role = Role.Button, onClick = alPulsar).semantics { contentDescription = descripcion }
            .padding(start = 10.dp, end = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(18.dp))
        Text("Nuevo", style = Textos.boton.copy(fontSize = 14.sp, color = colores.sobrePrimario))
    }
}

/** El buscador en píldora, con la lupa (`web.search-field`). */
@Composable
private fun Buscador(valor: String, ejemplo: String, descripcion: String, alCambiar: (String) -> Unit, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    Row(
        modifier.heightIn(min = 40.dp).clip(Radios.pildora).background(colores.superficie).border(1.dp, colores.contorno, Radios.pildora).padding(horizontal = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(18.dp))
        CampoLlano(valor, ejemplo, alCambiar, Modifier.weight(1f), descripcion = descripcion)
    }
}

// --- La ficha. ---

/** Las medidas de la ficha según el ancho: sus lados y si el margen va al lado (expandida), en dos columnas o en una. */
private class Hoja(clase: ClaseDeVentana) {
    val compacta = clase == ClaseDeVentana.Compacta
    val margenAlLado = clase == ClaseDeVentana.Expandida
    val lados = when (clase) {
        ClaseDeVentana.Compacta -> Espacios.e4
        ClaseDeVentana.Media -> 28.dp
        ClaseDeVentana.Expandida -> 40.dp
    }
    val propiedad = if (compacta) 40.dp else 32.dp
    val sobresale = if (compacta) Espacios.e2 else Espacios.e4
}

/**
 * La ficha, sobre el papel: la barra con la flecha (en el móvil) y el estado del guardado; el nombre como título, lo
 * que cambió en él, las propiedades en píldoras, los apodos y las entradas; al margen (o debajo), «Aparece en» y las
 * relaciones. Tocar fuera de un campo lo cierra, y con él se guarda el nombre.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Ficha(libroVm: LibroViewModel, vm: ElementosViewModel, libro: Libro, ficha: FichaEditable, conVolver: Boolean) {
    val colores = LocalColores.current
    val hoja = Hoja(LocalVentana.current.clase)
    val foco = LocalFocusManager.current
    val tipo = ficha.tipo
    val enlaces = remember(libro, ficha.id) { enlacesDe(libro).filterNot { ficha.id != null && it.id == ficha.id && Elemento.de(it.tipo) == tipo } }
    val apariciones = remember(libro, ficha.id) { if (tipo == Elemento.PERSONAJES) ListaDeElementos.apariciones(libro)[ficha.id].orEmpty() else emptyList() }
    Column(Modifier.fillMaxSize().background(colores.superficie)) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 44.dp)
                .then(if (hoja.compacta) Modifier.drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) } else Modifier)
                .padding(start = Espacios.e1, end = Espacios.e4),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (conVolver) BotonDeIcono(Iconos.arrowBack, "Volver a la lista de ${tipo.etiqueta.lowercase()}", { vm.volver() })
            Spacer(Modifier.weight(1f))
            if (vm.estado != EstadoDelGuardado.NADA) IndicadorDeGuardado(vm.estado, vm.textoDelEstado)
        }
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState())
                .pointerInput(Unit) { detectTapGestures { foco.clearFocus() } }
                .padding(start = hoja.lados, end = hoja.lados, top = if (hoja.compacta) Espacios.e4 else 4.dp, bottom = if (hoja.compacta) Espacios.e6 else 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val principal: @Composable (Modifier) -> Unit = { m ->
                Column(m) {
                    NombreDeLaFicha(vm, ficha, hoja)
                    if (ficha.nombreCambiado) QueCambioEnElNombre(vm, ficha)
                    Propiedades(vm, libro, ficha, hoja)
                    if (tipo == Elemento.PERSONAJES) Apodos(vm, ficha)
                    ficha.entradas.forEachIndexed { i, entrada -> Entrada(libroVm, vm, ficha, entrada, i, enlaces, hoja) }
                    Box(Modifier.padding(top = Espacios.e3).sobresalirIzquierda(Espacios.e2)) { BotonDeTexto("Entrada", Iconos.add) { vm.anadirEntrada() } }
                }
            }
            val bloques = buildList<@Composable () -> Unit> {
                if (apariciones.isNotEmpty()) add { ApareceEn(libroVm, apariciones, hoja) }
                when (tipo) {
                    Elemento.PERSONAJES -> add { RelacionesDePersonaje(vm, libro, ficha, hoja) }
                    Elemento.ORGANIZACIONES -> add { VinculosDeOrganizacion(vm, libro, ficha, hoja) }
                    Elemento.EVENTOS -> add { Participantes(vm, libro, ficha, hoja) }
                    else -> Unit
                }
            }
            if (hoja.margenAlLado) {
                Row(Modifier.widthIn(max = 920.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(40.dp)) {
                    principal(Modifier.weight(1f))
                    if (bloques.isNotEmpty()) Column(Modifier.width(232.dp).padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) { bloques.forEach { it() } }
                }
            } else {
                principal(Modifier.widthIn(max = 920.dp).fillMaxWidth())
                if (bloques.isNotEmpty()) {
                    val conRaya = Modifier.widthIn(max = 920.dp).fillMaxWidth().padding(top = 28.dp)
                        .drawBehind { drawRect(colores.contorno, Offset.Zero, Size(size.width, 1.dp.toPx())) }.padding(top = 20.dp)
                    // En el plegable abierto, en dos columnas (uno solo, a todo el ancho); en el móvil, en una.
                    if (!hoja.compacta && bloques.size > 1) {
                        Row(conRaya, horizontalArrangement = Arrangement.spacedBy(32.dp)) { bloques.forEach { b -> Column(Modifier.weight(1f)) { b() } } }
                    } else {
                        Column(conRaya, verticalArrangement = Arrangement.spacedBy(24.dp)) { bloques.forEach { it() } }
                    }
                }
            }
        }
    }
}

/**
 * El nombre es el título: un campo en serif sin caja hasta que se escribe en él. Mientras se escribe no se guarda; al
 * salir del campo (o con Intro), sí ([ElementosViewModel.confirmarNombre]).
 */
@Composable
private fun NombreDeLaFicha(vm: ElementosViewModel, ficha: FichaEditable, hoja: Hoja) {
    val colores = LocalColores.current
    val foco = LocalFocusManager.current
    var campo by remember(ficha.id) { mutableStateOf(TextFieldValue(ficha.nombre)) }
    if (campo.text != ficha.nombre) campo = campo.copy(text = ficha.nombre, selection = TextRange(minOf(campo.selection.start, ficha.nombre.length), minOf(campo.selection.end, ficha.nombre.length)))
    var enfocado by remember { mutableStateOf(false) }
    val error = vm.errorDeNombre ?: if (!ReglasDeLaFicha.nombreValido(ficha.nombre)) "El nombre necesita entre 3 y 100 caracteres." else null
    val forma = radioMedio
    BasicTextField(
        value = campo,
        onValueChange = { nuevo ->
            val texto = nuevo.text.take(100)
            campo = nuevo.copy(text = texto)
            if (texto != ficha.nombre) vm.cambiar { it.copy(nombre = texto) }
        },
        singleLine = true,
        textStyle = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = if (hoja.compacta) 24.sp else 30.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.2.em, color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { foco.clearFocus() }),
        modifier = Modifier.fillMaxWidth().sobresalirIzquierda(6.dp)
            .semantics { contentDescription = "Nombre de ${ficha.nombreOriginal ?: ficha.nombre}" }
            .onFocusChanged { estado ->
                if (estado.isFocused && !enfocado) vm.editandoNombre = true
                if (!estado.isFocused && enfocado) vm.confirmarNombre()
                enfocado = estado.isFocused
            },
        decorationBox = { interior ->
            Box(
                Modifier.fillMaxWidth().border(1.dp, if (enfocado) colores.primario else if (error != null) colores.error else Color.Transparent, forma)
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) { interior() }
        },
    )
    if (error != null) Text(error, style = Textos.cuerpo.copy(fontSize = 12.5.sp, color = colores.error), modifier = Modifier.padding(top = Espacios.e1))
}

/** Personajes con el nombre cambiado: si se llama así desde este libro (el anterior queda como apodo) o estaba mal escrito. */
@Composable
private fun QueCambioEnElNombre(vm: ElementosViewModel, ficha: FichaEditable) {
    val colores = LocalColores.current
    Column(
        Modifier.padding(top = Espacios.e3).fillMaxWidth().clip(radioMedio).background(colores.lienzo)
            .padding(horizontal = 14.dp, vertical = 8.dp).selectableGroup().semantics { contentDescription = "Qué ha cambiado en el nombre" },
    ) {
        listOf(
            CambioDeNombre.NARRATIVO to "Se llama así desde este libro; «${ficha.nombreOriginal.orEmpty().trim()}» queda como apodo",
            CambioDeNombre.ERRATA to "Estaba mal escrito",
        ).forEach { (cambio, texto) ->
            val elegido = ficha.cambioDeNombre == cambio
            Row(
                Modifier.fillMaxWidth().heightIn(min = 44.dp).selectable(elegido, role = Role.RadioButton) { vm.cambiar { it.copy(cambioDeNombre = cambio) } },
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(elegido, onClick = null, colors = RadioButtonDefaults.colors(selectedColor = colores.primario, unselectedColor = colores.tintaSuave))
                Text(texto, style = Textos.cuerpo.copy(fontSize = 13.5.sp, color = colores.tinta))
            }
        }
    }
}

/** Lo que pide cada tipo, en píldoras que abren su lista: estado y sexo, estado, lugar, o página y quién. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Propiedades(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable, hoja: Hoja) {
    val tipo = ficha.tipo
    if (tipo == Elemento.CONCEPTOS || tipo == Elemento.ORGANIZACIONES) return
    FlowRow(Modifier.padding(top = Espacios.e3), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        when (tipo) {
            Elemento.PERSONAJES -> {
                Propiedad("Estado", vm.estadosDePersonaje, ficha.estadoDePersonaje, hoja) { v -> vm.cambiar { it.copy(estadoDePersonaje = v) } }
                Propiedad("Sexo", listOf(0 to "Chico", 1 to "Chica", 2 to "No sé"), ficha.sexo, hoja) { v -> vm.cambiar { it.copy(sexo = v) } }
            }
            Elemento.LOCALIZACIONES -> Propiedad("Estado", vm.estadosDeLugar, ficha.estadoDeLugar, hoja) { v -> vm.cambiar { it.copy(estadoDeLugar = v) } }
            Elemento.EVENTOS -> Propiedad("Lugar", libro.localizaciones.map { it.id to it.nombre }, ficha.idLocalizacion, hoja) { v ->
                vm.cambiar { it.copy(idLocalizacion = v, textoDeLocalizacion = null) }
            }
            Elemento.CITAS -> {
                PropiedadDeTexto("Página", ficha.pagina, hoja) { v -> vm.cambiar { it.copy(pagina = v.filter(Char::isDigit)) } }
                val personajes = remember(libro) { ListaDeElementos.porOrigen(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES).map { it.id to it.nombre } }
                Propiedad("Quién", personajes, ficha.idPersonaje, hoja) { v -> vm.cambiar { it.copy(idPersonaje = v, textoDePersonaje = null) } }
            }
            Elemento.CONCEPTOS, Elemento.ORGANIZACIONES -> Unit
        }
    }
}

/** `.prop`: su nombre y su valor en una píldora con borde; al tocarla, la lista para elegir otro. */
@Composable
private fun <T> Propiedad(etiqueta: String, opciones: List<Pair<T, String>>, valor: T?, hoja: Hoja, alElegir: (T) -> Unit) {
    val colores = LocalColores.current
    var abierta by remember { mutableStateOf(false) }
    val actual = opciones.firstOrNull { it.first == valor }?.second
    Box {
        Row(
            Modifier.heightIn(min = hoja.propiedad).clip(Radios.pildora).border(1.dp, colores.contornoFuerte, Radios.pildora)
                .clickable(role = Role.Button) { abierta = true }.semantics { contentDescription = "$etiqueta: ${actual ?: "sin elegir"}" }
                .padding(start = Espacios.e3, end = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(etiqueta, style = Textos.cuerpo.copy(fontSize = 13.sp, color = colores.tintaSuave))
            Text(actual ?: "—", style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 220.dp))
            Icon(painterResource(Iconos.expandMore), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(16.dp))
        }
        DropdownMenu(abierta, onDismissRequest = { abierta = false }, containerColor = colores.superficie, modifier = Modifier.heightIn(max = 360.dp)) {
            opciones.forEach { (opcion, texto) ->
                val elegida = opcion == valor
                DropdownMenuItem(
                    text = { Text(texto, style = Textos.cuerpo.copy(fontWeight = if (elegida) FontWeight.SemiBold else FontWeight.Normal, color = colores.tinta)) },
                    trailingIcon = if (elegida) ({ Icon(painterResource(Iconos.check), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp)) }) else null,
                    onClick = {
                        abierta = false
                        if (!elegida) alElegir(opcion)
                    },
                )
            }
        }
    }
}

/** Una propiedad que se escribe (la página de una cita): la píldora con su campo numérico. */
@Composable
private fun PropiedadDeTexto(etiqueta: String, valor: String, hoja: Hoja, alCambiar: (String) -> Unit) {
    val colores = LocalColores.current
    var enfocado by remember { mutableStateOf(false) }
    Row(
        Modifier.heightIn(min = hoja.propiedad).clip(Radios.pildora).border(if (enfocado) 2.dp else 1.dp, if (enfocado) colores.primario else colores.contornoFuerte, Radios.pildora)
            .padding(start = Espacios.e3, end = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(etiqueta, style = Textos.cuerpo.copy(fontSize = 13.sp, color = colores.tintaSuave))
        BasicTextField(
            value = valor,
            onValueChange = alCambiar,
            singleLine = true,
            textStyle = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
            modifier = Modifier.width(52.dp).semantics { contentDescription = etiqueta }.onFocusChanged { enfocado = it.isFocused },
        )
    }
}

/** Los apodos en serif cursiva, con su «×» (salvo el nombre actual, que la API no deja quitar), y el campo para añadir uno. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Apodos(vm: ElementosViewModel, ficha: FichaEditable) {
    val colores = LocalColores.current
    var nuevo by remember(ficha.id) { mutableStateOf("") }
    val anadir = { if (vm.anadirApodo(nuevo)) nuevo = "" }
    FlowRow(
        Modifier.padding(top = Espacios.e3).semantics { contentDescription = "Apodos" },
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        ficha.apodos.forEach { apodo ->
            val esElNombre = ReglasDeLaFicha.esElNombre(ficha, apodo)
            Row(
                Modifier.heightIn(min = 32.dp).clip(RoundedCornerShape(16.dp)).background(colores.superficieContenedor)
                    .padding(start = 12.dp, end = if (esElNombre) 12.dp else 2.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(apodo, style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontStyle = FontStyle.Italic, fontSize = 14.5.sp, color = colores.tinta))
                if (!esElNombre) {
                    Box(
                        Modifier.size(28.dp).clip(CircleShape).clickable(role = Role.Button) { vm.cambiar { it.copy(apodos = it.apodos - apodo) } }
                            .semantics { contentDescription = "Quitar el apodo «$apodo»" },
                        contentAlignment = Alignment.Center,
                    ) { Icon(painterResource(Iconos.close), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(16.dp)) }
                }
            }
        }
        var enfocado by remember { mutableStateOf(false) }
        BasicTextField(
            value = nuevo,
            onValueChange = { nuevo = it.take(100) },
            singleLine = true,
            textStyle = Textos.cuerpo.copy(fontSize = 13.5.sp, color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { anadir() }),
            modifier = Modifier.widthIn(min = 132.dp).semantics { contentDescription = "Añadir apodo" }
                .onFocusChanged { estado ->
                    if (!estado.isFocused && enfocado) anadir()
                    enfocado = estado.isFocused
                },
            decorationBox = { interior ->
                Box(
                    Modifier.heightIn(min = 32.dp).border(if (enfocado) 2.dp else 1.dp, if (enfocado) colores.primario else colores.contornoFuerte, RoundedCornerShape(16.dp))
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (nuevo.isEmpty()) Text("Añadir apodo", style = Textos.cuerpo.copy(fontSize = 13.5.sp, color = colores.tintaSuave), maxLines = 1)
                    interior()
                }
            },
        )
    }
}

private val estiloDeTituloDeEntrada = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 19.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.4.em)

/**
 * Una entrada: leída, su título y su texto enteros, en serif, que al tocarlos la abren para escribir (con el cursor
 * donde se tocó); abierta, sobre el lienzo, el título como campo, el «⋯» con «Eliminar» y el editor con su barra.
 */
@Composable
private fun Entrada(libroVm: LibroViewModel, vm: ElementosViewModel, ficha: FichaEditable, entrada: EntradaEditable, indice: Int, enlaces: List<EnlaceNarrativo>, hoja: Hoja) {
    val colores = LocalColores.current
    val tipo = ficha.tipo
    val abierta = vm.entradaAbierta == entrada.clave
    val titulo = entrada.titulo.trim().ifEmpty { "Descripción" }
    val alAbrirEnlace = libroVm::abrirEnlace
    val fondo = if (abierta) {
        Modifier.sobresalir(hoja.sobresale).clip(RoundedCornerShape(12.dp)).background(colores.lienzo)
            .padding(horizontal = hoja.sobresale, vertical = if (hoja.compacta) Espacios.e3 else Espacios.e4)
    } else Modifier
    Column(Modifier.padding(top = 28.dp).fillMaxWidth().then(fondo).semantics { contentDescription = "Entrada ${indice + 1}" }) {
        if (abierta) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                TituloDeEntrada(vm, entrada, indice, Modifier.weight(1f))
                MenuDeEntrada(vm, entrada, indice)
            }
            EditorRtf(
                valor = entrada.descripcion,
                alCambiar = { nuevo -> vm.cambiarEntrada(entrada.clave) { it.copy(descripcion = nuevo) } },
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                enlaces = enlaces,
                alAbrirEnlace = alAbrirEnlace,
                idLibro = libroVm.abierto?.id,
                descripcion = "Texto de la entrada ${indice + 1}",
                seleccionarTodoAlEnfocar = ReglasDeLaFicha.esDescripcionPorDefecto(tipo, entrada.descripcion),
                barraSoloAlEscribir = false,
                cursorAlMontar = vm.cursorAlAbrir,
                alPonerElCursor = vm::cursorPuesto,
            )
            if (!ReglasDeLaFicha.tituloValido(entrada.titulo)) Error("El título necesita al menos 3 caracteres.")
            if (!ReglasDeLaFicha.descripcionValida(entrada.descripcion)) Error("El texto necesita al menos 15 caracteres.")
        } else {
            Text(
                titulo,
                style = estiloDeTituloDeEntrada.copy(color = colores.tinta),
                modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClickLabel = "Escribir en la entrada $titulo") { vm.abrirEntrada(entrada.clave) }
                    .semantics { heading() },
            )
            if (!ReglasDeLaFicha.esDeRelleno(tipo, entrada)) {
                Box(Modifier.padding(top = 6.dp)) {
                    EditorRtf(
                        valor = entrada.descripcion, alCambiar = {}, modifier = Modifier.widthIn(max = 660.dp).fillMaxWidth(),
                        enlaces = enlaces, alAbrirEnlace = alAbrirEnlace, descripcion = "Texto de $titulo",
                        soloLectura = true, alTocarParaEscribir = { posicion -> vm.abrirEntrada(entrada.clave, posicion) },
                    )
                }
            }
        }
    }
}

/** El título de la entrada abierta, en serif y sobre una raya; «Descripción» se selecciona entero al entrar. */
@Composable
private fun TituloDeEntrada(vm: ElementosViewModel, entrada: EntradaEditable, indice: Int, modifier: Modifier) {
    val colores = LocalColores.current
    var campo by remember(entrada.clave) { mutableStateOf(TextFieldValue(entrada.titulo)) }
    if (campo.text != entrada.titulo) campo = campo.copy(text = entrada.titulo, selection = TextRange(minOf(campo.selection.start, entrada.titulo.length), minOf(campo.selection.end, entrada.titulo.length)))
    var enfocado by remember { mutableStateOf(false) }
    BasicTextField(
        value = campo,
        onValueChange = { nuevo ->
            val texto = nuevo.text.take(100)
            campo = nuevo.copy(text = texto)
            if (texto != entrada.titulo) vm.cambiarEntrada(entrada.clave) { it.copy(titulo = texto) }
        },
        singleLine = true,
        textStyle = estiloDeTituloDeEntrada.copy(color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        modifier = modifier
            .semantics { contentDescription = "Título de la entrada ${indice + 1}" }
            .onFocusChanged { estado ->
                if (estado.isFocused && !enfocado && entrada.titulo == "Descripción") campo = campo.copy(selection = TextRange(0, entrada.titulo.length))
                enfocado = estado.isFocused
            },
        decorationBox = { interior ->
            Box(
                Modifier.fillMaxWidth().heightIn(min = 44.dp)
                    .drawBehind { drawRect(if (enfocado) colores.primario else colores.contornoFuerte, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                    .padding(bottom = 4.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (entrada.titulo.isEmpty()) Text("Título de la entrada", style = estiloDeTituloDeEntrada.copy(color = colores.tintaSuave))
                interior()
            }
        },
    )
}

/** «⋯» de la entrada: eliminarla. */
@Composable
private fun MenuDeEntrada(vm: ElementosViewModel, entrada: EntradaEditable, indice: Int) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box {
        BotonDeIconoPequeno(Iconos.moreHoriz, "Más: eliminar la entrada ${indice + 1}", grande = true) { abierto = true }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
            DropdownMenuItem(
                text = { Text("Eliminar la entrada", style = Textos.cuerpo.copy(color = colores.error)) },
                leadingIcon = { Icon(painterResource(Iconos.delete), contentDescription = null, tint = colores.error, modifier = Modifier.size(20.dp)) },
                onClick = { abierto = false; vm.quitarEntrada(entrada.clave) },
            )
        }
    }
}

@Composable
private fun Error(texto: String) {
    Text(texto, style = Textos.cuerpo.copy(fontSize = 12.5.sp, color = LocalColores.current.error), modifier = Modifier.padding(top = Espacios.e1))
}

// --- Al margen: dónde sale y con quién. ---

@Composable
private fun TituloDeBloque(texto: String) {
    Text(texto, style = Textos.cuerpo.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.3.em, color = LocalColores.current.tintaSuave), modifier = Modifier.padding(bottom = Espacios.e2).semantics { heading() })
}

/** «Aparece en»: los capítulos en los que sale, como números; si solo se le nombra, «@N», sin relleno. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ApareceEn(libroVm: LibroViewModel, apariciones: List<Aparicion>, hoja: Hoja) {
    val colores = LocalColores.current
    val lado = if (hoja.compacta) 40.dp else 32.dp
    Column {
        TituloDeBloque("Aparece en")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            apariciones.forEach { (capitulo, nombrado) ->
                val forma = RoundedCornerShape(6.dp)
                Box(
                    Modifier.widthIn(min = lado).heightIn(min = lado).clip(forma)
                        .then(if (nombrado) Modifier.border(1.dp, colores.contornoFuerte, forma) else Modifier.background(colores.contenedorPrimario))
                        .clickable(role = Role.Button) { libroVm.ir(VistaDelLibro.DeCapitulo(capitulo.id)) }
                        .semantics { contentDescription = "Capítulo ${capitulo.orden}${if (nombrado) ", solo nombrado" else ""}" }
                        .padding(horizontal = 4.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "${if (nombrado) "@" else ""}${capitulo.orden}",
                        style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = if (nombrado) FontWeight.Medium else FontWeight.SemiBold, fontStyle = if (nombrado) FontStyle.Italic else FontStyle.Normal, color = colores.tinta, fontFeatureSettings = "tnum"),
                    )
                }
            }
        }
    }
}

/** Las relaciones de un personaje: el otro, «qué es» de él y la «×»; «+ Relación» abre el buscador para añadir o quitar. */
@Composable
private fun RelacionesDePersonaje(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable, hoja: Hoja) {
    var abierto by remember(ficha.id) { mutableStateOf(false) }
    var buscado by remember(ficha.id) { mutableStateOf("") }
    Column {
        TituloDeBloque("Relaciones")
        ficha.relaciones.forEach { r ->
            val nombre = libro.personajes.firstOrNull { it.id == r.idPersonaje }?.nombre ?: "Personaje ${r.idPersonaje}"
            FilaDeRelacion(
                nombre, r.parentesco, "Qué es", "Qué es $nombre de ${ficha.nombre}",
                alCambiar = { v -> vm.cambiar { f -> f.copy(relaciones = f.relaciones.map { if (it.idPersonaje == r.idPersonaje) it.copy(parentesco = v) else it }) } },
                alQuitar = { vm.cambiar { f -> f.copy(relaciones = f.relaciones.filter { it.idPersonaje != r.idPersonaje }) } },
            )
        }
        BotonDeRelacion(abierto) { abierto = !abierto; buscado = "" }
        if (abierto) {
            Selector(buscado, "Buscar personaje", "Buscar personaje para relacionar", { buscado = it }) {
                val consulta = plegar(buscado).trim()
                ListaDeElementos.mezclados(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES)
                    .filter { it.id != ficha.id && (consulta.isEmpty() || plegar(it.nombre).contains(consulta)) }
                    .forEach { p ->
                        val dentro = ficha.relaciones.any { it.idPersonaje == p.id }
                        OpcionDelSelector(p.nombre, dentro, hoja) {
                            vm.cambiar { f -> if (dentro) f.copy(relaciones = f.relaciones.filter { it.idPersonaje != p.id }) else f.copy(relaciones = f.relaciones + RelacionEditable(p.id)) }
                        }
                    }
            }
        }
    }
}

/** Las relaciones de una organización con personajes y lugares, con lo que las une (15 caracteres como mínimo). */
@Composable
private fun VinculosDeOrganizacion(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable, hoja: Hoja) {
    var abierto by remember(ficha.id) { mutableStateOf(false) }
    var buscado by remember(ficha.id) { mutableStateOf("") }
    Column {
        TituloDeBloque("Relaciones")
        ficha.vinculos.forEach { v ->
            val nombre = if (v.personaje) libro.personajes.firstOrNull { it.id == v.id }?.nombre ?: "Personaje ${v.id}"
            else libro.localizaciones.firstOrNull { it.id == v.id }?.nombre ?: "Localización ${v.id}"
            FilaDeRelacion(
                nombre, v.descripcion, "Qué relación tiene", "Relación con $nombre",
                alCambiar = { d -> vm.cambiar { f -> f.copy(vinculos = f.vinculos.map { if (it.personaje == v.personaje && it.id == v.id) it.copy(descripcion = d) else it }) } },
                alQuitar = { alternarVinculo(vm, v.personaje, v.id, quitar = true) },
            )
            if (ficha.tocada && !ReglasDeLaFicha.vinculoValido(v)) Error(ReglasDeLaFicha.ERROR_DE_VINCULO)
        }
        BotonDeRelacion(abierto) { abierto = !abierto; buscado = "" }
        if (abierto) {
            Selector(buscado, "Buscar personaje o lugar", "Buscar personaje o lugar para relacionar", { buscado = it }) {
                val consulta = plegar(buscado).trim()
                val coincide = { nombre: String -> consulta.isEmpty() || plegar(nombre).contains(consulta) }
                ListaDeElementos.mezclados(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES).filter { coincide(it.nombre) }.forEach { p ->
                    val dentro = ficha.vinculos.any { it.personaje && it.id == p.id }
                    OpcionDelSelector(p.nombre, dentro, hoja) { alternarVinculo(vm, true, p.id, dentro) }
                }
                libro.localizaciones.filter { plegar(it.nombre).trim() != "sin localizacion" && coincide(it.nombre) }.sortedBy { plegar(it.nombre) }.forEach { l ->
                    val dentro = ficha.vinculos.any { !it.personaje && it.id == l.id }
                    OpcionDelSelector(l.nombre, dentro, hoja, icono = Iconos.place) { alternarVinculo(vm, false, l.id, dentro) }
                }
            }
        }
    }
}

private fun alternarVinculo(vm: ElementosViewModel, personaje: Boolean, id: Int, quitar: Boolean) = vm.cambiar { f ->
    if (quitar) f.copy(vinculos = f.vinculos.filterNot { it.personaje == personaje && it.id == id })
    else f.copy(vinculos = f.vinculos + VinculoDeOrganizacion(personaje, id))
}

/** «Quién» en un evento: todos los personajes por grupo, a la vista; tocarlos los pone o los quita. */
@Composable
private fun Participantes(vm: ElementosViewModel, libro: Libro, ficha: FichaEditable, hoja: Hoja) {
    val colores = LocalColores.current
    val grupos = remember(libro) {
        ListaDeElementos.agruparPorGrupo(ListaDeElementos.porOrigen(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES), { it.grupo }, { it.ordenGrupo }, { it.nombre })
    }
    Column {
        TituloDeBloque("Quién")
        Column(
            Modifier.fillMaxWidth().heightIn(max = 320.dp).clip(radioMedio).background(colores.lienzo).verticalScroll(rememberScrollState()).padding(Espacios.e2),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            grupos.forEach { (_, miembros) ->
                miembros.forEach { p ->
                    val dentro = p.id in ficha.participantes
                    OpcionDelSelector(p.nombre, dentro, hoja) { vm.cambiar { f -> f.copy(participantes = if (dentro) f.participantes - p.id else f.participantes + p.id) } }
                }
            }
        }
    }
}

/** Una relación: el otro en serif, lo que la describe en un campo sin caja y la «×». */
@Composable
private fun FilaDeRelacion(nombre: String, valor: String, ejemplo: String, descripcion: String, alCambiar: (String) -> Unit, alQuitar: () -> Unit) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
        Text(nombre, style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 160.dp))
        CampoLlano(valor, ejemplo, alCambiar, Modifier.weight(1f), descripcion = descripcion, conBordeAlEnfocar = true)
        BotonDeIconoPequeno(Iconos.close, "Quitar la relación con $nombre", alPulsar = alQuitar)
    }
}

@Composable
private fun BotonDeRelacion(abierto: Boolean, alPulsar: () -> Unit) {
    Box(Modifier.sobresalirIzquierda(Espacios.e2).semantics { stateDescription = if (abierto) "Abierto" else "Cerrado" }) { BotonDeTexto("Relación", Iconos.add, alPulsar = alPulsar) }
}

/** El buscador de «+ Relación»: sobre el lienzo, el campo y las opciones (las elegidas, resaltadas), con su alto tope. */
@Composable
private fun Selector(buscado: String, ejemplo: String, descripcion: String, alBuscar: (String) -> Unit, opciones: @Composable () -> Unit) {
    val colores = LocalColores.current
    Column(Modifier.padding(top = Espacios.e2).fillMaxWidth().clip(radioMedio).background(colores.lienzo).padding(Espacios.e2)) {
        Buscador(buscado, ejemplo, descripcion, alBuscar, Modifier.fillMaxWidth().padding(bottom = Espacios.e1))
        Column(Modifier.heightIn(max = 280.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(2.dp)) { opciones() }
    }
}

/** `.picker__item`: una opción del selector; elegida, en negrita y con el fondo del primario. */
@Composable
private fun OpcionDelSelector(texto: String, elegida: Boolean, hoja: Hoja, @DrawableRes icono: Int? = null, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = if (hoja.compacta) 44.dp else 36.dp).clip(RoundedCornerShape(6.dp))
            .background(if (elegida) colores.contenedorPrimario else Color.Transparent)
            .clickable(role = Role.Checkbox, onClick = alPulsar).semantics { selected = elegida }
            .padding(horizontal = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(16.dp))
        Text(texto, style = Textos.cuerpo.copy(fontSize = 13.5.sp, fontWeight = if (elegida) FontWeight.SemiBold else FontWeight.Normal, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// --- El alta rápida. ---

/**
 * El alta rápida (`<dialog>` en la web, hoja aquí): lo mínimo para que exista; el resto, en su ficha. Solo el nombre
 * obliga; el sexo, a la vista, empieza en «No sé». «Crear» abre la ficha del nuevo y «Crear y otro», otra hoja vacía.
 */
@Composable
private fun HojaDeAlta(vm: ElementosViewModel, libro: Libro, tipo: Elemento) {
    val colores = LocalColores.current
    val ficha = vm.ficha?.takeIf { vm.modo == ModoDeElementos.Alta }
    val titulo = nuevo(tipo)
    val compacta = LocalVentana.current.clase == ClaseDeVentana.Compacta
    HojaInferior(abierta = ficha != null, alCerrar = { vm.volver() }, titulo = titulo) {
        if (ficha == null) return@HojaInferior
        val enfocar = remember { FocusRequester() }
        LaunchedEffect(Unit) { runCatching { enfocar.requestFocus() } }
        Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(start = Espacios.e4, end = Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
            Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.lectura, fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = colores.tinta), modifier = Modifier.weight(1f).semantics { heading() })
            BotonDeIcono(Iconos.close, "Cerrar", { vm.volver() })
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            val nombreError = vm.errorDeNombre ?: if ((ficha.tocada || vm.revisarCampos) && !ReglasDeLaFicha.nombreValido(ficha.nombre)) "Escribe un nombre de al menos 3 caracteres." else null
            CampoConContorno(
                if (tipo == Elemento.CITAS) "Título" else "Nombre", ficha.nombre, { v -> vm.cambiar { it.copy(nombre = v) } },
                Modifier.fillMaxWidth().focusRequester(enfocar), error = nombreError, maximo = 100, alIntro = { vm.crearDesdeLaHoja(otro = false) },
            )
            when (tipo) {
                Elemento.PERSONAJES -> Pareja(!compacta,
                    { m -> SelectorConContorno("Estado", vm.estadosDePersonaje, ficha.estadoDePersonaje, { v -> vm.cambiar { it.copy(estadoDePersonaje = v) } }, m) },
                    { m -> SexoALaVista(ficha.sexo, m) { v -> vm.cambiar { it.copy(sexo = v) } } })
                Elemento.LOCALIZACIONES -> SelectorConContorno("Estado", vm.estadosDeLugar, ficha.estadoDeLugar, { v -> vm.cambiar { it.copy(estadoDeLugar = v) } }, Modifier.fillMaxWidth())
                Elemento.EVENTOS -> {
                    val elegida = libro.localizaciones.firstOrNull { it.id == ficha.idLocalizacion }?.nombre.orEmpty()
                    val consulta = ficha.textoDeLocalizacion?.let { plegar(it).trim() }.orEmpty()
                    AutocompletadoConContorno(
                        "Lugar", ficha.textoDeLocalizacion ?: elegida,
                        libro.localizaciones.filter { consulta.isEmpty() || plegar(it.nombre).contains(consulta) }.map { it.id to it.nombre },
                        "No hay localizaciones disponibles",
                        alEscribir = { v -> vm.cambiar { it.copy(textoDeLocalizacion = v, idLocalizacion = null) } },
                        alElegir = { id -> vm.cambiar { it.copy(idLocalizacion = id, textoDeLocalizacion = null) } },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Elemento.CITAS -> Pareja(!compacta,
                    { m -> CampoConContorno("Página", ficha.pagina, { v -> vm.cambiar { it.copy(pagina = v.filter(Char::isDigit)) } }, m, numerico = true) },
                    { m ->
                        val elegido = libro.personajes.firstOrNull { it.id == ficha.idPersonaje }?.nombre.orEmpty()
                        val consulta = ficha.textoDePersonaje?.let { plegar(it).trim() }.orEmpty()
                        AutocompletadoConContorno(
                            "Quién", ficha.textoDePersonaje ?: elegido,
                            ListaDeElementos.porOrigen(ListaDeElementos.elementos(libro, Elemento.PERSONAJES), Elemento.PERSONAJES)
                                .filter { consulta.isEmpty() || plegar(it.nombre).contains(consulta) }.map { it.id to it.nombre },
                            "No hay personajes disponibles",
                            alEscribir = { v -> vm.cambiar { it.copy(textoDePersonaje = v, idPersonaje = null) } },
                            alElegir = { id -> vm.cambiar { it.copy(idPersonaje = id, textoDePersonaje = null) } },
                            modifier = m,
                        )
                    })
                else -> Unit
            }
            if (vm.revisarCampos) ReglasDeLaFicha.pista(ficha)?.let { Error(it) }
            Row(Modifier.fillMaxWidth().padding(top = Espacios.e1, bottom = Espacios.e4), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
                val ancho = if (compacta) Modifier.weight(1f) else Modifier
                Boton("Crear y otro", { vm.crearDesdeLaHoja(otro = true) }, ancho, variante = VarianteDeBoton.Contorno, habilitado = !vm.guardando)
                Boton("Crear", { vm.crearDesdeLaHoja(otro = false) }, ancho, habilitado = !vm.guardando)
            }
        }
    }
}

/** El sexo con sus tres opciones a la vista («Chico», «Chica», «No sé»), como un segmentado. */
@Composable
private fun SexoALaVista(valor: Int?, modifier: Modifier, alElegir: (Int) -> Unit) {
    val colores = LocalColores.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text("Sexo", style = Textos.cuerpo.copy(fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(Radios.pildora).background(colores.superficieContenedor).padding(3.dp).selectableGroup()
                .semantics { contentDescription = "Sexo" },
        ) {
            listOf(0 to "Chico", 1 to "Chica", 2 to "No sé").forEach { (opcion, texto) ->
                val elegida = valor == opcion
                Box(
                    Modifier.weight(1f).heightIn(min = 42.dp).clip(Radios.pildora).background(if (elegida) colores.superficie else Color.Transparent)
                        .selectable(elegida, role = Role.RadioButton) { alElegir(opcion) },
                    contentAlignment = Alignment.Center,
                ) { Text(texto, style = Textos.cuerpo.copy(fontSize = 14.sp, fontWeight = if (elegida) FontWeight.Bold else FontWeight.Medium, color = if (elegida) colores.primario else colores.tintaSuave)) }
            }
        }
    }
}

/** Dos campos en una fila desde 600 dp; uno debajo de otro en el móvil. */
@Composable
private fun Pareja(ancha: Boolean, primero: @Composable (Modifier) -> Unit, segundo: @Composable (Modifier) -> Unit) {
    if (ancha) Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) { primero(Modifier.weight(1f)); segundo(Modifier.weight(1f)) }
    else Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) { primero(Modifier.fillMaxWidth()); segundo(Modifier.fillMaxWidth()) }
}

// --- Piezas. ---

/** Corre el elemento [lado] a la izquierda y lo ensancha lo mismo (el `margin-left` negativo de la web). */
private fun Modifier.sobresalirIzquierda(lado: Dp): Modifier = layout { medible, limites ->
    val extra = lado.roundToPx()
    val ancho = if (limites.hasBoundedWidth) limites.maxWidth + extra else limites.maxWidth
    val colocable = medible.measure(limites.copy(maxWidth = ancho))
    layout(maxOf(colocable.width - extra, 0), colocable.height) { colocable.place(-extra, 0) }
}

/**
 * Un `input` llano: sin caja ([conBordeAlEnfocar]: con un borde fino al escribir, como los de las relaciones), con su
 * texto de ejemplo.
 */
@Composable
private fun CampoLlano(valor: String, ejemplo: String, alCambiar: (String) -> Unit, modifier: Modifier, descripcion: String = ejemplo, conBordeAlEnfocar: Boolean = false) {
    val colores = LocalColores.current
    var enfocado by remember { mutableStateOf(false) }
    val forma = RoundedCornerShape(6.dp)
    BasicTextField(
        value = valor,
        onValueChange = alCambiar,
        singleLine = true,
        textStyle = Textos.cuerpo.copy(fontSize = 13.5.sp, color = if (enfocado || !conBordeAlEnfocar) colores.tinta else colores.tintaSuave),
        cursorBrush = SolidColor(colores.primario),
        modifier = modifier.semantics { contentDescription = descripcion }.onFocusChanged { enfocado = it.isFocused },
        decorationBox = { interior ->
            Box(
                Modifier.fillMaxWidth().heightIn(min = 32.dp)
                    .then(if (conBordeAlEnfocar) Modifier.border(1.dp, if (enfocado) colores.primario else Color.Transparent, forma).padding(horizontal = 6.dp) else Modifier),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (valor.isEmpty()) Text(ejemplo, style = Textos.cuerpo.copy(fontSize = 13.5.sp, color = colores.tintaSuave), maxLines = 1)
                interior()
            }
        },
    )
}
