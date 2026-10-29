package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.ui.libro.TituloEnLinea
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.Obra
import kotlinx.coroutines.delay
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.Chip
import es.yosiftware.libros.ui.componentes.EstadoDeChip
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2

// La Biblioteca de la APK: src/app/components/mobile/user/mobile-library-view/, en su versión de la APK de Capacitor
// (las reglas `native-mobile` del Sass de 5dc3120, la que se capturó): la vista ocupa el lienzo entero, la búsqueda
// queda anclada arriba y los universos son tarjetas con sus sagas colgando de una línea guía.

/** El rótulo pequeño en mayúsculas de las secciones («Continúa leyendo», «Sagas», «Historias independientes»). */
private val rotulo = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.08.em)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PantallaBiblioteca(
    vm: BibliotecaViewModel,
    alAbrirLibro: (Obra) -> Unit,
    alAbrirAntologia: (Obra) -> Unit,
    alVerEdiciones: (Obra) -> Unit,
    alAbrirCatalogo: () -> Unit,
) {
    val colores = LocalColores.current
    val ventana = LocalVentana.current
    val lista = rememberLazyListState()
    val desplazada by remember { derivedStateOf { lista.firstVisibleItemIndex > 0 || lista.firstVisibleItemScrollOffset > 1 } }
    val columnas = when {
        ventana.anchoDp >= 900 -> 3
        ventana.anchoDp >= 600 -> 2
        else -> 1
    }
    val ancha = ventana.anchoDp >= 600
    val abrir: (Obra) -> Unit = { if (it.esAntologia) alAbrirAntologia(it) else alAbrirLibro(it) }
    // «Ver en biblioteca» desde el catálogo: primero hasta el universo de la obra, ya abierto; después, su tarjeta
    // se trae a la vista ella sola ([Revelable]).
    LaunchedEffect(vm.porRevelar) {
        val id = vm.porRevelar ?: return@LaunchedEffect
        val posicion = vm.visibles.indexOfFirst { it.id == id }
        if (posicion >= 0) {
            val antes = 1 + (if (vm.filtrosAbiertos) 1 else 0) + (if (!vm.hayFiltros && vm.enMarcha(6).isNotEmpty()) 1 else 0) + 1
            lista.animateScrollToItem(antes + posicion)
        }
        vm.revelado()
    }

    Box(Modifier.fillMaxSize().background(colores.lienzo)) {
        LazyColumn(Modifier.fillMaxSize(), state = lista, contentPadding = PaddingValues(bottom = Espacios.e8)) {
            stickyHeader(key = "busqueda") { BarraDeBusqueda(vm, desplazada) }

            if (vm.filtrosAbiertos) item(key = "filtros") { PanelDeFiltros(vm, ancha) }

            val enMarcha = if (!vm.cargando && !vm.hayFiltros) vm.enMarcha(6) else emptyList()
            if (enMarcha.isNotEmpty()) item(key = "continua") { ContinuaLeyendo(enMarcha, alAbrirLibro) }

            when {
                vm.cargando -> item(key = "cargando") { Cargando() }
                vm.errorDeCarga != null && vm.universos.isEmpty() -> item(key = "error") {
                    // TODO(clon): la web no tiene pantalla para este fallo (el almacén de universos se queda vacío); aquí
                    // se dice y se ofrece reintentar, con el aspecto del estado vacío.
                    Vacio(Iconos.cloudOff, "No pudimos cargar tu biblioteca", vm.errorDeCarga!!.mensajeO("Comprueba la conexión e inténtalo de nuevo."), "Reintentar", vm::reintentar)
                }
                vm.vista == Vista.ESTADOS -> {
                    // Su margen de 12 dp y el de «Continúa leyendo» se juntan, como en CSS.
                    item(key = "pestanas") { PestanasDeEstado(vm, arriba = if (enMarcha.isNotEmpty()) 0.dp else Espacios.e3) }
                    vm.grupoActivo?.let { grupo ->
                        item(key = "rejilla-${grupo.estado}") {
                            Rejilla(grupo.obras, columnas, Modifier.padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e4)) { obra ->
                                Revelable(vm, obra) { TarjetaDeObra(obra, { abrir(obra) }, { vm.abrirEditor(obra) }, { alVerEdiciones(obra) }) }
                            }
                        }
                    }
                }
                vm.visibles.isNotEmpty() -> {
                    // Los 16 dp de `.m-library__sections` y los 12 de «Continúa leyendo» se juntan, como en CSS.
                    item(key = "hueco") { Spacer(Modifier.height(if (enMarcha.isNotEmpty()) Espacios.e1 else Espacios.e4)) }
                    items(vm.visibles, key = { "universo-${it.id}" }) { universo ->
                        TarjetaDeUniverso(
                            universo = universo,
                            vm = vm,
                            columnas = columnas,
                            ancha = ancha,
                            alAbrir = abrir,
                            alVerEdiciones = alVerEdiciones,
                            modifier = Modifier.padding(start = Espacios.e3, end = Espacios.e3, bottom = Espacios.e3),
                        )
                    }
                }
                vm.hayObras -> item(key = "sin-coincidencias") {
                    Vacio(Iconos.searchOff, "No encontramos coincidencias", "Prueba con otra búsqueda o limpia los filtros.", "Limpiar filtros", vm::limpiarFiltros, tonal = true)
                }
                else -> item(key = "vacia") {
                    Vacio(Iconos.autoStories, "Tu biblioteca está esperando", "Explora el catálogo y añade tu primera lectura.", "Abrir catálogo", alAbrirCatalogo)
                }
            }
        }
    }
}

// --- La búsqueda. ---

/**
 * `.m-library__search` en la APK: anclada arriba, 56 dp, sobre el lienzo; al desplazar, una raya y una sombra suave
 * debajo. Dentro, la búsqueda con ámbitos (app-mobile-scoped-search, variante `bar`: sin borde ni fondo) y el botón de
 * los filtros.
 */
@Composable
private fun BarraDeBusqueda(vm: BibliotecaViewModel, desplazada: Boolean) {
    val colores = LocalColores.current
    var enfocada by remember { mutableStateOf(false) }
    val raya = if (desplazada) mezclar(colores.contornoFuerte, 0.58f) else Color.Transparent
    Column(
        Modifier
            .fillMaxWidth()
            .background(colores.lienzo)
            .drawBehind {
                if (desplazada) {
                    drawRect(mezclar(colores.tinta, 0.08f), Offset(0f, size.height), Size(size.width, 6.dp.toPx()))
                }
                drawRect(raya, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx()))
            },
    ) {
        Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
            CampoDeBusquedaConAmbitos(
                vm.borrador, vm::escribir, { vm.confirmarBorrador() }, "Título, autor, universo…", "Buscar en tu colección",
                hayFiltros = vm.hayFiltros, alLimpiar = vm::limpiarFiltros, tintaDeLimpiar = colores.tinta,
                alCambiarFoco = { enfocada = it }, modifier = Modifier.weight(1f),
            )
            // El botón de los filtros: 56 dp, cuadrado en la APK, en el primario; abierto, sobre el contenedor primario.
            Box(
                Modifier.size(56.dp)
                    .background(if (vm.filtrosAbiertos) colores.contenedorPrimario else Color.Transparent)
                    .clickable(onClick = vm::alternarFiltros)
                    .semantics { contentDescription = "Filtros" },
                contentAlignment = Alignment.Center,
            ) {
                Icon(painterResource(Iconos.tune), contentDescription = null, tint = if (vm.filtrosAbiertos) colores.sobreContenedorPrimario else colores.primario, modifier = Modifier.size(24.dp))
            }
        }
        // Con algo escrito y el foco, el desplegable de ámbitos (`m-scoped-search__suggestions`).
        if (enfocada && vm.borrador.isNotBlank()) SugerenciasDeAmbito(Ambito.entries, vm.borrador, vm::confirmarBorrador, Modifier.padding(horizontal = Espacios.e4))
        if (vm.chips.isNotEmpty()) {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e2, bottom = Espacios.e2),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            ) {
                vm.chips.forEach { chip ->
                    ChipQuitable("${chip.ambito.etiqueta}: ${chip.valor}", "Quitar filtro ${chip.valor}") { vm.quitarFiltro(chip.crudo) }
                }
            }
        }
    }
}

/**
 * `m-scoped-search__suggestions`: con algo escrito y el foco, un botón por ámbito con el [borrador] (la Biblioteca y el
 * Catálogo). [modifier] va entre el ancho completo y el resto, para los márgenes de cada pantalla.
 */
/**
 * El campo de `m-scoped-search` de la Biblioteca y del Catálogo: la lupa, el texto con su marcador y, con filtros, la
 * X de limpiar. Cada pantalla pone sus botones al lado y sus sugerencias y chips debajo.
 */
@Composable
internal fun CampoDeBusquedaConAmbitos(
    borrador: String,
    alEscribir: (String) -> Unit,
    alConfirmar: () -> Unit,
    marcador: String,
    descripcion: String,
    hayFiltros: Boolean,
    alLimpiar: () -> Unit,
    tintaDeLimpiar: Color,
    alCambiarFoco: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colores = LocalColores.current
    Row(
        modifier.heightIn(min = 56.dp).padding(start = Espacios.e4, end = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
        BasicTextField(
            value = borrador,
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
                    if (borrador.isEmpty()) Text(marcador, style = Textos.cuerpo.copy(color = colores.tintaSuave), maxLines = 1)
                    campo()
                }
            },
        )
        if (hayFiltros) {
            Box(Modifier.size(44.dp).clip(CircleShape).clickable(onClick = alLimpiar), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.close), contentDescription = "Limpiar búsqueda", tint = tintaDeLimpiar, modifier = Modifier.size(24.dp))
            }
        }
    }
}

@Composable
internal fun SugerenciasDeAmbito(ambitos: List<Ambito>, borrador: String, alElegir: (Ambito) -> Unit, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(
        Modifier.fillMaxWidth().then(modifier).padding(top = Espacios.e1)
            .sombra2(forma, colores)
            .background(colores.superficie, forma)
            .border(1.dp, colores.contorno, forma)
            .padding(Espacios.e2),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        ambitos.forEach { ambito ->
            Row(
                Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(RoundedCornerShape(Radios.xs))
                    .clickable { alElegir(ambito) }
                    .padding(horizontal = Espacios.e3, vertical = Espacios.e2),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(ambito.etiqueta.replaceFirstChar { it.uppercase() }, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.primario))
                Text(borrador.trim(), style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

/** Un chip seleccionado con su aspa, que se quita al tocarlo. */
@Composable
internal fun ChipQuitable(texto: String, descripcion: String, alQuitar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.heightIn(min = 32.dp).clip(Radios.pildora).background(colores.contenedorPrimario).clickable(onClick = alQuitar)
            .semantics { contentDescription = descripcion }
            .padding(horizontal = 13.dp, vertical = 7.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(texto, style = Textos.chip.copy(color = colores.sobreContenedorPrimario), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 190.dp))
        Icon(painterResource(Iconos.close), contentDescription = null, tint = colores.sobreContenedorPrimario, modifier = Modifier.size(16.dp))
    }
}

// --- Los filtros. ---

/** `.m-library__filters`: «Organizar por» (Universos/Estados) y, con universos, la disponibilidad. Dos columnas desde 600 dp. */
@Composable
private fun PanelDeFiltros(vm: BibliotecaViewModel, ancha: Boolean) {
    val colores = LocalColores.current
    val etiqueta = Textos.cuerpo.copy(fontSize = rem(0.76), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave)
    val organizar: @Composable (Modifier) -> Unit = { m ->
        Column(m) {
            Text("Organizar por", style = etiqueta, modifier = Modifier.padding(bottom = Espacios.e2))
            Row(Modifier.fillMaxWidth().clip(Radios.pildora).background(colores.superficieContenedor).padding(4.dp)) {
                Vista.entries.forEach { opcion ->
                    val activa = vm.vista == opcion
                    Box(
                        Modifier.weight(1f).heightIn(min = 40.dp).clip(Radios.pildora)
                            .background(if (activa) colores.contenedorPrimario else Color.Transparent)
                            .clickable { vm.elegirVista(opcion) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (opcion == Vista.UNIVERSOS) "Universos" else "Estados",
                            style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.ExtraBold, lineHeight = 1.em,
                                color = if (activa) colores.sobreContenedorPrimario else colores.tintaSuave),
                        )
                    }
                }
            }
        }
    }
    val disponibilidad: @Composable (Modifier) -> Unit = { m ->
        Column(m) {
            Text("Disponibilidad", style = etiqueta, modifier = Modifier.padding(bottom = Espacios.e2))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Disponibilidad.entries.forEach { opcion ->
                    Chip(opcion.etiqueta, estado = if (vm.disponibilidad == opcion) EstadoDeChip.Seleccionado else EstadoDeChip.Normal, alPulsar = { vm.elegirDisponibilidad(opcion) })
                }
            }
        }
    }
    Tarjeta(Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e3)) {
        if (ancha) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                organizar(Modifier.weight(1f))
                if (vm.vista == Vista.UNIVERSOS) disponibilidad(Modifier.weight(1f)) else Spacer(Modifier.weight(1f))
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                organizar(Modifier.fillMaxWidth())
                if (vm.vista == Vista.UNIVERSOS) disponibilidad(Modifier.fillMaxWidth())
            }
        }
    }
}

/** Las pestañas de la vista por estados: un chip por estado con su icono y cuántas obras tiene. */
@Composable
private fun PestanasDeEstado(vm: BibliotecaViewModel, arriba: Dp) {
    val activo = vm.grupoActivo?.estado
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(start = Espacios.e3, end = Espacios.e3, top = arriba),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        vm.grupos.forEach { grupo ->
            Chip(
                "${grupo.estado.nombre} · ${grupo.obras.size}",
                estado = if (grupo.estado == activo) EstadoDeChip.Seleccionado else EstadoDeChip.Normal,
                icono = iconoDeEstado(grupo.estado),
                tamanoDelIcono = 16.dp,
                alPulsar = { vm.elegirEstado(grupo.estado) },
            )
        }
    }
}

// --- Continúa leyendo. ---

/** `.m-library__continue`: un carrusel con los libros en marcha (hasta 6): portada, autoría y progreso. */
@Composable
private fun ContinuaLeyendo(libros: List<Obra>, alAbrir: (Obra) -> Unit) {
    val colores = LocalColores.current
    Column(Modifier.fillMaxWidth().padding(bottom = Espacios.e3), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        Text("CONTINÚA LEYENDO", style = rotulo.copy(color = colores.tintaSuave), modifier = Modifier.padding(horizontal = Espacios.e2))
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            // `flex: 0 0 min(84%, 320px)`: el 84 % del carril sin sus 8 dp de relleno a cada lado.
            val anchoDeTarjeta: Dp = minOf((maxWidth - Espacios.e2 * 2) * 0.84f, 320.dp)
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(start = Espacios.e2, end = Espacios.e2, top = 2.dp, bottom = Espacios.e1),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            ) {
                libros.forEach { libro ->
                    val forma = RoundedCornerShape(Radios.lg)
                    Row(
                        Modifier.width(anchoDeTarjeta).heightIn(min = 112.dp).clip(forma)
                            .background(colores.superficieContenedor).border(1.dp, colores.contorno, forma)
                            .clickable { alAbrir(libro) }
                            .semantics { contentDescription = "Abrir ${libro.nombre}" }
                            .padding(Espacios.e2),
                        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                    ) {
                        Portada(libro.portada, null, Modifier.width(64.dp).height(96.dp).clip(RoundedCornerShape(6.dp)))
                        Column(Modifier.weight(1f).heightIn(min = 96.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(libro.nombre, style = Textos.cuerpo.copy(fontSize = rem(0.95), fontWeight = FontWeight.Bold, lineHeight = 1.25.em, color = colores.tinta), maxLines = 2, overflow = TextOverflow.Ellipsis)
                            libro.tituloPropio?.let { TituloEnLinea(it) }
                            val pequena = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.tintaSuave)
                            Text(libro.autores.joinToString(", ") { it.nombre }, style = pequena, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.weight(1f))
                            val porcentaje = porcentajeLeido(libro)
                            Box(Modifier.fillMaxWidth().height(6.dp).clip(Radios.pildora).background(colores.contorno)) {
                                Box(Modifier.fillMaxWidth((porcentaje / 100).toFloat()).fillMaxHeight().clip(Radios.pildora).background(colores.primario))
                            }
                            Text("${numero(porcentaje)}% leído", style = pequena)
                        }
                    }
                }
            }
        }
    }
}

// --- Universos y sagas. ---

/**
 * Un universo (`.m-library__universe`): tarjeta con su nombre, el icono de mundo en su color, cuántos títulos tiene y,
 * abierto, sus sagas y sus historias independientes. «Sin universo» va sin icono ni color.
 */
@Composable
private fun TarjetaDeUniverso(
    universo: Universo,
    vm: BibliotecaViewModel,
    columnas: Int,
    ancha: Boolean,
    alAbrir: (Obra) -> Unit,
    alVerEdiciones: (Obra) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.lg)
    val tono = tonoDeUniverso(universo)
    val acento = tono?.let { Color.hsl(it, 0.48f, 0.43f) } ?: colores.tinta
    val abierto = vm.estaAbierto(universo)
    val total = totalDeObras(universo)
    Column(modifier.fillMaxWidth().clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).clickable { vm.alternarUniverso(universo.id) }
                .padding(horizontal = Espacios.e4, vertical = Espacios.e3),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                    if (tono != null) Icon(painterResource(Iconos.public), contentDescription = null, tint = acento, modifier = Modifier.size(18.dp))
                    Text(
                        universo.nombre,
                        style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(if (ancha) 1.18 else 1.08), lineHeight = 1.1.em, fontWeight = FontWeight.Bold, color = colores.tinta),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                // Los autores del universo solo caben desde 600 dp.
                if (ancha && tono != null && universo.autores.isNotEmpty()) {
                    Text(universo.autores.joinToString(", ") { it.nombre }, style = Textos.cuerpo.copy(fontSize = rem(0.76), color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Text(
                if (ancha) etiquetaDeTitulos(total) else total.toString(),
                style = Textos.cuerpo.copy(fontSize = rem(0.76), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave, textAlign = TextAlign.End),
                modifier = Modifier.widthIn(min = if (ancha) 66.dp else 18.dp),
            )
            Icon(painterResource(if (abierto) Iconos.expandLess else Iconos.expandMore), contentDescription = if (abierto) "Plegar ${universo.nombre}" else "Desplegar ${universo.nombre}", tint = colores.tinta, modifier = Modifier.size(24.dp))
        }
        if (abierto) {
            val sagas = sagasVisibles(universo)
            val sueltas = obrasIndependientes(universo)
            Column(Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, bottom = Espacios.e3), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                if (sagas.isNotEmpty()) {
                    Text("SAGAS", style = rotulo.copy(fontSize = rem(0.7), color = colores.tintaSuave), modifier = Modifier.padding(top = Espacios.e2, start = Espacios.e1, end = Espacios.e1))
                    // Las sagas cuelgan de una línea guía de 2 dp.
                    Column(
                        Modifier.fillMaxWidth().padding(start = Espacios.e1)
                            .drawBehind { drawRect(colores.contorno, Offset.Zero, Size(2.dp.toPx(), size.height)) }
                            .padding(start = 2.dp + Espacios.e2),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        sagas.forEachIndexed { indice, saga ->
                            FilaDeSaga(saga, sagas, posicionEnCadena(sagas, indice), vm, columnas, alAbrir, alVerEdiciones)
                        }
                    }
                }
                if (sueltas.isNotEmpty()) {
                    if (sagas.isNotEmpty()) {
                        Text("HISTORIAS INDEPENDIENTES", style = rotulo.copy(fontSize = rem(0.7), color = colores.tintaSuave), modifier = Modifier.padding(top = Espacios.e2, start = Espacios.e1, end = Espacios.e1))
                    }
                    Rejilla(sueltas, columnas) { obra -> Revelable(vm, obra) { TarjetaDeObra(obra, { alAbrir(obra) }, { vm.abrirEditor(obra) }, { alVerEdiciones(obra) }) } }
                }
            }
        }
    }
}

/**
 * Una saga (`.m-library__saga`): icono, nombre, subtítulo, «Sigue a…/Continúa en…», las portadas (plegada), cuántas
 * obras tiene y el chevrón. Abierta, sobre el contenedor al 70 % y con sus obras. Las encadenadas llevan la barra de
 * acento a la izquierda y se juntan entre sí.
 */
@Composable
private fun FilaDeSaga(
    saga: Saga,
    mostradas: List<Saga>,
    posicion: PosicionEnCadena?,
    vm: BibliotecaViewModel,
    columnas: Int,
    alAbrir: (Obra) -> Unit,
    alVerEdiciones: (Obra) -> Unit,
) {
    val colores = LocalColores.current
    val abierta = vm.estaAbierta(saga.id)
    val obras = obrasDeSaga(saga)
    val r = Radios.md
    val forma = when (posicion) {
        PosicionEnCadena.INICIO -> RoundedCornerShape(topStart = r, topEnd = r, bottomEnd = r, bottomStart = 0.dp)
        PosicionEnCadena.MEDIO -> RoundedCornerShape(0.dp)
        PosicionEnCadena.FINAL -> RoundedCornerShape(topStart = 0.dp, topEnd = r, bottomEnd = r, bottomStart = r)
        null -> RoundedCornerShape(r)
    }
    val acentoDeSaga = colores.terciario
    Column(
        Modifier
            .fillMaxWidth()
            .offset(y = if (posicion == PosicionEnCadena.MEDIO || posicion == PosicionEnCadena.FINAL) (-4).dp else 0.dp)
            .clip(forma)
            .background(if (abierta) mezclar(colores.superficieContenedor, 0.7f) else Color.Transparent)
            .drawBehind { if (posicion != null) drawRect(acentoDeSaga, Offset.Zero, Size(2.dp.toPx(), size.height)) }
            .padding(bottom = if (abierta) Espacios.e2 else 0.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(r)).clickable { vm.alternarSaga(saga.id) }
                .padding(horizontal = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(Iconos.collectionsBookmark), contentDescription = null, tint = acentoDeSaga, modifier = Modifier.size(20.dp))
            Column(Modifier.weight(1f)) {
                Text(saga.nombre, style = Textos.cuerpo.copy(fontSize = rem(0.9), fontWeight = FontWeight.SemiBold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
                saga.subtitulo?.takeIf { it.isNotBlank() }?.let {
                    Text(it, style = Textos.cuerpo.copy(fontSize = rem(0.72), color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                leyendaDeCadena(saga, mostradas)?.let { leyenda ->
                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Icon(painterResource(Iconos.link), contentDescription = null, tint = acentoDeSaga, modifier = Modifier.size(16.dp).padding(top = 1.dp))
                        Text(leyenda, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.SemiBold, lineHeight = 1.3.em, color = acentoDeSaga))
                    }
                }
            }
            if (!abierta) {
                // Hasta tres portadas montadas 8 dp, con un borde de la superficie.
                Row {
                    obras.take(3).forEachIndexed { i, obra ->
                        Portada(
                            obra.portada, null,
                            Modifier.offset(x = (-8 * i).dp).width(18.dp).height(27.dp)
                                .border(2.dp, colores.superficie, RoundedCornerShape(3.dp)).clip(RoundedCornerShape(3.dp)),
                        )
                    }
                }
            }
            Text(
                obras.size.toString(),
                style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave),
                modifier = Modifier.clip(Radios.pildora).background(colores.superficieContenedor).padding(horizontal = 8.dp, vertical = 1.dp),
            )
            Icon(painterResource(if (abierta) Iconos.expandLess else Iconos.expandMore), contentDescription = if (abierta) "Plegar ${saga.nombre}" else "Desplegar ${saga.nombre}", tint = colores.tintaSuave, modifier = Modifier.size(20.dp))
        }
        if (abierta) {
            Rejilla(obras, columnas, Modifier.padding(start = Espacios.e2, end = Espacios.e2, top = Espacios.e1)) { obra ->
                Revelable(vm, obra) { TarjetaDeObra(obra, { alAbrir(obra) }, { vm.abrirEditor(obra) }, { alVerEdiciones(obra) }) }
            }
        }
    }
}

/** La tarjeta a la que lleva «Ver en biblioteca»: cuando se pinta, se trae a la vista (`scrollIntoView`). */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun Revelable(vm: BibliotecaViewModel, obra: Obra, tarjeta: @Composable () -> Unit) {
    if (vm.obraPorRevelar != "${obra.tipo}-${obra.id}") {
        tarjeta()
        return
    }
    val traer = remember { BringIntoViewRequester() }
    LaunchedEffect(Unit) {
        // Tras el desplazamiento hasta su universo.
        delay(400)
        traer.bringIntoView()
        vm.obraRevelada()
    }
    Box(Modifier.bringIntoViewRequester(traer)) { tarjeta() }
}

/** `.m-library__grid`: una columna, dos desde 600 dp y tres desde 900, con 12 dp entre tarjetas. */
@Composable
private fun Rejilla(obras: List<Obra>, columnas: Int, modifier: Modifier = Modifier, tarjeta: @Composable (Obra) -> Unit) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        obras.chunked(columnas).forEach { fila ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                fila.forEach { obra -> Box(Modifier.weight(1f)) { tarjeta(obra) } }
                repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

// --- Cargando y vacíos. ---

@Composable
private fun Cargando() {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth().padding(horizontal = Espacios.e3).padding(top = Espacios.e6).heightIn(min = 280.dp).padding(Espacios.e7)
            .semantics { contentDescription = "Cargando tu biblioteca…" },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Rueda(38.dp, 3.dp)
        Text("Cargando tu biblioteca…", style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center), modifier = Modifier.padding(top = Espacios.e2))
    }
}

/** La rueda de carga: un anillo de la superficie alta con un cuarto del primario que gira cada 0,8 s. */
@Composable
internal fun Rueda(tamano: Dp, grosor: Dp) {
    val colores = LocalColores.current
    val giro by rememberInfiniteTransition(label = "rueda").animateFloat(0f, 360f, infiniteRepeatable(tween(800, easing = LinearEasing), RepeatMode.Restart), label = "giro")
    Box(
        Modifier.size(tamano).rotate(giro).drawBehind {
            val g = grosor.toPx()
            val caja = Size(size.width - g, size.height - g)
            drawArc(colores.superficieAlta, 0f, 360f, false, Offset(g / 2, g / 2), caja, style = Stroke(g))
            drawArc(colores.primario, -135f, 90f, false, Offset(g / 2, g / 2), caja, style = Stroke(g, cap = StrokeCap.Butt))
        },
    )
}

/** `.m-library__empty` (una `.m-card`): icono, título, explicación y la acción. */
@Composable
private fun Vacio(icono: Int, titulo: String, texto: String, accion: String, alPulsar: () -> Unit, tonal: Boolean = false) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e6)) {
        Column(
            Modifier.fillMaxWidth().heightIn(min = 248.dp).padding(Espacios.e7 - Espacios.e4),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(44.dp))
            Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.5), fontWeight = FontWeight.Medium, lineHeight = 1.2.em, color = colores.tinta, textAlign = TextAlign.Center), modifier = Modifier.padding(top = Espacios.e3))
            Text(texto, style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center), modifier = Modifier.widthIn(max = 300.dp).padding(top = Espacios.e2, bottom = Espacios.e4))
            Boton(accion, alPulsar, variante = if (tonal) VarianteDeBoton.Tonal else VarianteDeBoton.Primario)
        }
    }
}
