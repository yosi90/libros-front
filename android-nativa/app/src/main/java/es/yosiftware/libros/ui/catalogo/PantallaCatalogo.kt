package es.yosiftware.libros.ui.catalogo

import androidx.annotation.DrawableRes
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.biblioteca.ChipQuitable
import es.yosiftware.libros.ui.biblioteca.SugerenciasDeAmbito
import es.yosiftware.libros.ui.biblioteca.iconoDeEstado
import es.yosiftware.libros.ui.biblioteca.nombreDeEstado
import es.yosiftware.libros.ui.biblioteca.ultimoEstado
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.ColumnaEstirada
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
import es.yosiftware.libros.ui.tema.sombra1
import es.yosiftware.libros.ui.tema.sombra2

// El Catálogo de la APK: src/app/components/mobile/user/mobile-catalog-view/, en su versión de la APK de Capacitor (las
// reglas `native-mobile` del Sass de 5dc3120, la que se capturó): la búsqueda anclada arriba, los filtros en una tarjeta,
// las sagas que coinciden y una tarjeta por obra.

/** Los `h2` y `h3` sin clase propia llevan la tipografía de Angular Material: 28 y 24 sp, de peso normal. */
internal val tituloH2 = Textos.cuerpo.copy(fontSize = rem(1.75), lineHeight = 1.2.em)
internal val tituloH3 = Textos.cuerpo.copy(fontSize = rem(1.5), lineHeight = 1.33.em)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun PantallaCatalogo(vm: CatalogoViewModel) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    val lista = rememberLazyListState()
    val desplazada by remember { derivedStateOf { lista.firstVisibleItemIndex > 0 || lista.firstVisibleItemScrollOffset > 1 } }

    Box(Modifier.fillMaxSize().background(colores.lienzo)) {
        LazyColumn(Modifier.fillMaxSize(), state = lista, contentPadding = PaddingValues(bottom = Espacios.e8)) {
            stickyHeader(key = "busqueda") { BarraDeBusqueda(vm, desplazada) }
            if (vm.filtrosAbiertos) item(key = "filtros") { PanelDeFiltros(vm, ancha) }
            // `.saga-matches`: su margen de 16 dp y los 24 de lo que sigue se juntan, como en CSS.
            if (vm.sagas.isNotEmpty()) item(key = "sagas") { SagasQueCoinciden(vm.sagas, vm::abrirSaga) }
            when {
                vm.cargando -> item(key = "cargando") {
                    Estado(Iconos.hourglassTop, null, "Cargando catálogo…", conTarjeta = false)
                }
                vm.obras.isNotEmpty() -> item(key = "rejilla") {
                    Rejilla(vm.obras, if (ancha) 2 else 1) { obra -> TarjetaDeCatalogo(obra) { vm.abrirFicha(obra) } }
                }
                vm.errorDeCarga.isNotEmpty() -> item(key = "error") {
                    Estado(Iconos.cloudOff, "No se pudo cargar el catálogo", vm.errorDeCarga) {
                        Boton("Reintentar", vm::reintentar, Modifier.fillMaxWidth().padding(top = Espacios.e5), icono = Iconos.refresh)
                    }
                }
                else -> item(key = "vacio") {
                    Estado(Iconos.searchOff, "Sin resultados", "Prueba con otros filtros o solicita el título que falta.") {
                        Boton("Solicitar un libro nuevo", { vm.pedirNuevo() }, Modifier.fillMaxWidth().padding(top = Espacios.e5), icono = Iconos.add)
                    }
                }
            }
        }
    }
}

// --- La búsqueda. ---

/**
 * `.m-catalog__search` en la APK: anclada arriba, 56 dp, sobre el lienzo; al desplazar, una raya y una sombra suave
 * debajo. La búsqueda con ámbitos (variante `bar`) con sus chips debajo, y los botones de los filtros y de pedir un
 * libro, centrados en su alto. En la captura los dos iconos van en la tinta, sin el primario del Sass de la vista.
 */
@Composable
private fun BarraDeBusqueda(vm: CatalogoViewModel, desplazada: Boolean) {
    val colores = LocalColores.current
    var enfocada by remember { mutableStateOf(false) }
    val raya = if (desplazada) mezclar(colores.contornoFuerte, 0.58f) else Color.Transparent
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .background(colores.lienzo)
            .drawBehind {
                if (desplazada) drawRect(mezclar(colores.tinta, 0.08f), Offset(0f, size.height), Size(size.width, 6.dp.toPx()))
                drawRect(raya, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx()))
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(start = Espacios.e4, end = Espacios.e2),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
                BasicTextField(
                    value = vm.borrador,
                    onValueChange = vm::escribir,
                    modifier = Modifier.weight(1f).onFocusChanged { enfocada = it.isFocused }
                        .semantics { contentDescription = "Buscar en catálogo" },
                    singleLine = true,
                    textStyle = Textos.cuerpo.copy(color = colores.tinta),
                    cursorBrush = SolidColor(colores.primario),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { vm.confirmarBorrador() }),
                    decorationBox = { campo ->
                        Box {
                            if (vm.borrador.isEmpty()) Text("Título o autor…", style = Textos.cuerpo.copy(color = colores.tintaSuave), maxLines = 1)
                            campo()
                        }
                    },
                )
                if (vm.hayFiltros) {
                    Box(Modifier.size(44.dp).clip(CircleShape).clickable(onClick = vm::limpiarFiltros), contentAlignment = Alignment.Center) {
                        Icon(painterResource(Iconos.close), contentDescription = "Limpiar búsqueda", tint = colores.primario, modifier = Modifier.size(24.dp))
                    }
                }
            }
            if (enfocada && vm.borrador.isNotBlank()) SugerenciasDeAmbito(ambitosDelCatalogo, vm.borrador, vm::confirmarBorrador)
            if (vm.chips.isNotEmpty()) {
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = Espacios.e2),
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                ) {
                    vm.chips.forEach { chip ->
                        ChipQuitable("${chip.ambito.etiqueta}: ${chip.valor}", "Quitar filtro ${chip.valor}") { vm.quitarFiltro(chip.crudo) }
                    }
                }
            }
        }
        BotonCuadrado(Iconos.tune, "Filtros", vm.filtrosAbiertos, vm::alternarFiltros)
        BotonCuadrado(Iconos.add, "Solicitar un libro nuevo", false) { vm.pedirNuevo() }
    }
}

/** Los botones de 56 dp de la barra: sin fondo y, activo, sobre el contenedor de la superficie. */
@Composable
private fun BotonCuadrado(@DrawableRes icono: Int, descripcion: String, activo: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.size(56.dp)
            .background(if (activo) colores.superficieContenedor else Color.Transparent)
            .clickable(onClick = alPulsar)
            .semantics { contentDescription = descripcion },
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = if (activo) colores.sobreContenedorPrimario else colores.tinta, modifier = Modifier.size(24.dp))
    }
}


// --- Los filtros. ---

/** `.m-catalog__filters`: el tipo, cuatro desplegables y «Limpiar filtros». Dos columnas desde 600 dp. */
@Composable
private fun PanelDeFiltros(vm: CatalogoViewModel, ancha: Boolean) {
    val colores = LocalColores.current
    val desplegables: List<@Composable (Modifier) -> Unit> = listOf(
        { m -> Desplegable("Estado", vm.estado?.nombre ?: "Todos", listOf<Pair<String, TipoDeEstado?>>("Todos" to null) + TipoDeEstado.entries.map { it.nombre to it }, vm::elegirEstado, m) },
        { m -> Desplegable("Puntuación", vm.puntuacionMinima?.let { "$it+" } ?: "Todas", listOf<Pair<String, Int?>>("Todas" to null) + (1..5).map { "$it+" to it }, vm::elegirPuntuacionMinima, m) },
        { m -> Desplegable("Idioma", vm.idiomas.firstOrNull { it.id == vm.idiomaId }?.nombre ?: "Todos", listOf<Pair<String, Int?>>("Todos" to null) + vm.idiomas.map { it.nombre to it.id }, vm::elegirIdioma, m) },
        { m -> Desplegable("Estilo", vm.estilos.firstOrNull { it.id == vm.estiloId }?.nombre ?: "Todos", listOf<Pair<String, Int?>>("Todos" to null) + vm.estilos.map { it.nombre to it.id }, vm::elegirEstilo, m) },
    )
    Tarjeta(Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e3)) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Row(Modifier.fillMaxWidth().clip(Radios.pildora).background(colores.superficieContenedor).padding(4.dp)) {
                TipoDeFiltro.entries.forEach { opcion ->
                    val activa = vm.tipo == opcion
                    Box(
                        Modifier.weight(1f).heightIn(min = 40.dp).clip(Radios.pildora)
                            .background(if (activa) colores.contenedorPrimario else Color.Transparent)
                            .clickable { vm.elegirTipo(opcion) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            opcion.etiqueta,
                            style = Textos.cuerpo.copy(fontSize = rem(0.76), fontWeight = FontWeight.ExtraBold, lineHeight = 1.em,
                                color = if (activa) colores.sobreContenedorPrimario else colores.tintaSuave),
                        )
                    }
                }
            }
            if (ancha) {
                desplegables.chunked(2).forEach { fila ->
                    Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) { fila.forEach { it(Modifier.weight(1f)) } }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                    Boton("Limpiar filtros", vm::limpiarFiltros, Modifier.weight(1f), variante = VarianteDeBoton.Contorno)
                    Spacer(Modifier.weight(1f))
                }
            } else {
                desplegables.forEach { it(Modifier.fillMaxWidth()) }
                Boton("Limpiar filtros", vm::limpiarFiltros, Modifier.fillMaxWidth(), variante = VarianteDeBoton.Contorno)
            }
        }
    }
}

/**
 * Un `<label>` con su `<select>`: la etiqueta de .72rem y 800 en la tinta suave y, 6 dp debajo, la caja de 48 dp con el
 * borde del contorno fuerte. El `select` hereda la letra de la etiqueta.
 *
 * TODO(clon): la WebView abre la lista nativa de Android (un diálogo con botones de opción); aquí es un menú desplegable.
 */
@Composable
private fun <T> Desplegable(etiqueta: String, actual: String, opciones: List<Pair<String, T>>, alElegir: (T) -> Unit, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    val letra = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold)
    val forma = RoundedCornerShape(Radios.sm)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(etiqueta, style = letra.copy(color = colores.tintaSuave))
        Box {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(forma).background(colores.superficie)
                    .border(1.dp, colores.contornoFuerte, forma)
                    .clickable { abierto = true }
                    .semantics { contentDescription = "$etiqueta: $actual" }
                    .padding(horizontal = Espacios.e3),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(actual, style = letra.copy(color = colores.tinta), modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                // La flecha fina del `select` de la WebView.
                Box(
                    Modifier.width(12.dp).height(7.dp).drawBehind {
                        val trazo = 1.dp.toPx()
                        drawLine(colores.tinta, Offset(0f, 0f), Offset(size.width / 2, size.height), trazo)
                        drawLine(colores.tinta, Offset(size.width / 2, size.height), Offset(size.width, 0f), trazo)
                    },
                )
            }
            DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
                opciones.forEach { (texto, valor) ->
                    DropdownMenuItem(
                        text = { Text(texto, style = Textos.cuerpo.copy(color = colores.tinta, fontWeight = if (texto == actual) FontWeight.Bold else FontWeight.Normal)) },
                        onClick = {
                            abierto = false
                            alElegir(valor)
                        },
                    )
                }
            }
        }
    }
}

// --- Las sagas que coinciden. ---

/** `.saga-matches` en la APK: «Sagas» y un chip por saga, en una fila que se desplaza. */
@Composable
private fun SagasQueCoinciden(sagas: List<Saga>, alAbrir: (Int) -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(start = Espacios.e4, end = Espacios.e4, top = 0.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "SAGAS",
            style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.Bold, letterSpacing = 0.06.em, color = colores.primario),
            modifier = Modifier.padding(end = 4.dp),
        )
        sagas.forEach { saga ->
            Row(
                Modifier.heightIn(min = 40.dp).clip(Radios.pildora).background(colores.superficieContenedor)
                    .border(1.dp, colores.contorno, Radios.pildora)
                    .clickable { alAbrir(saga.id) }
                    .padding(start = 8.dp, end = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(Iconos.collectionsBookmark), contentDescription = null, tint = colores.terciario, modifier = Modifier.size(20.dp))
                Text(
                    if (saga.subtitulo.isNullOrEmpty()) saga.nombre else "${saga.nombre} · ${saga.subtitulo}",
                    style = Textos.cuerpo.copy(fontSize = rem(0.875), fontWeight = FontWeight.Medium, color = colores.tinta),
                    maxLines = 1,
                )
            }
        }
    }
}

// --- Las obras. ---

/** `.m-catalog__grid`: una columna, dos desde 600 dp, con 12 dp entre tarjetas y 24 por encima. */
@Composable
private fun Rejilla(obras: List<Obra>, columnas: Int, tarjeta: @Composable (Obra) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e6), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        obras.chunked(columnas).forEach { fila ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                fila.forEach { obra -> Box(Modifier.weight(1f).fillMaxHeight()) { tarjeta(obra) } }
                repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

/**
 * `.m-catalog-card`: la portada de 76 dp a todo el alto, la autoría en el primario, el nombre en la letra de display (dos
 * líneas como mucho), el estado de la persona y la flecha. Si la obra es suya, el borde lleva el primario.
 */
@Composable
private fun TarjetaDeCatalogo(obra: Obra, alAbrir: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    val suya = Catalogo.estaEnColeccion(obra)
    val borde = if (suya) mezclar(colores.primario, 0.48f, colores.contorno) else colores.contorno
    Row(
        Modifier.fillMaxSize().heightIn(min = 116.dp).height(IntrinsicSize.Min)
            .sombra1(forma, colores).clip(forma).background(colores.superficie).border(1.dp, borde, forma)
            .clickable(onClick = alAbrir)
            .semantics { contentDescription = obra.nombre },
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Portada(obra.portada, "Portada de ${obra.nombre}", Modifier.width(76.dp).fillMaxHeight().heightIn(min = 116.dp))
        Column(Modifier.weight(1f)) {
            Text(Catalogo.autores(obra), style = Textos.cuerpo.copy(fontSize = rem(0.7), fontWeight = FontWeight.ExtraBold, color = colores.primario), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                obra.nombre,
                style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.05), lineHeight = 1.16.em, color = colores.tinta),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 5.dp, bottom = Espacios.e3),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) {
                val estilo = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.Bold, color = colores.tintaSuave)
                if (suya) {
                    val icono = if (Catalogo.tieneSoloEdicion(obra)) Iconos.libraryBooks else iconoDeEstado(obra.ultimoEstado)
                    Icon(painterResource(icono), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(16.dp))
                    Text(nombreDeEstado(obra.estadoActual).ifEmpty { "En mi biblioteca" }, style = estilo)
                } else {
                    Text("Fuera de tu biblioteca", style = estilo)
                }
            }
        }
        Box(Modifier.width(32.dp), contentAlignment = Alignment.CenterStart) {
            Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.contornoFuerte, modifier = Modifier.size(24.dp))
        }
    }
}

// --- Cargando, error y vacío. ---

/**
 * `.m-catalog__state`: 300 dp de alto como mínimo, 24 dp por encima y 32 de relleno (que en el error y el vacío
 * sustituyen a los 16 de la `.m-card`), el icono de 44 dp en el primario, el título, la explicación y la acción. Es una
 * rejilla centrada: lo que le sobra de alto se reparte entre sus filas ([ColumnaEstirada]).
 *
 * TODO(clon): los huecos entre el icono, el título, el texto y el botón están medidos sobre la captura
 * (catalogo__busqueda-con-saga): son mayores que los 8 dp del Sass, que la WebView no aplicó tal cual.
 */
@Composable
private fun Estado(@DrawableRes icono: Int, titulo: String?, texto: String, conTarjeta: Boolean = true, accion: @Composable () -> Unit = {}) {
    val colores = LocalColores.current
    val relleno = if (conTarjeta) Espacios.e4 + 1.dp else 0.dp
    val cuerpo: @Composable () -> Unit = {
        ColumnaEstirada(Modifier.fillMaxWidth().heightIn(min = 300.dp - relleno * 2).padding(Espacios.e7 - relleno)) {
            val fila: @Composable (@Composable () -> Unit) -> Unit = { contenido -> Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { contenido() } }
            fila { Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(44.dp)) }
            if (titulo != null) fila { Text(titulo, style = tituloH2.copy(color = colores.tinta, textAlign = TextAlign.Center), modifier = Modifier.padding(top = 20.dp, bottom = 18.dp)) }
            fila { Text(texto, style = Textos.cuerpo.copy(color = colores.tinta, textAlign = TextAlign.Center), modifier = Modifier.padding(vertical = Espacios.e4)) }
            fila { accion() }
        }
    }
    val margen = Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, top = Espacios.e6)
    if (conTarjeta) Tarjeta(margen) { cuerpo() } else Box(margen) { cuerpo() }
}
