package es.yosiftware.libros.ui.libro

import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.min
import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sign

// El libro de la APK: src/app/components/mobile/book/mobile-book-shell/ en su versión de la APK de Capacitor (5dc3120):
// la barra con sus herramientas, el contenido, el índice que se abre por encima y se cierra arrastrándolo, la navegación
// de abajo (Índice y Elementos; desde 600 dp, Índice y los seis elementos), la hoja de Elementos y el editor de partes e
// interludios.

/** Un icono de cada elemento (`entityToolbarActions`). */
private fun iconoDe(elemento: Elemento): Int = when (elemento) {
    Elemento.PERSONAJES -> Iconos.coPresent
    Elemento.ORGANIZACIONES -> Iconos.groups
    Elemento.EVENTOS -> Iconos.event
    Elemento.LOCALIZACIONES -> Iconos.myLocation
    Elemento.CONCEPTOS -> Iconos.autoAwesome
    Elemento.CITAS -> Iconos.formatQuote
}

/** Arrastrar el índice más de esto hacia un lado lo cierra (`finishIndexDrag`). */
private val ArrastreParaCerrar = 72.dp

@Composable
fun PantallaLibro(vm: LibroViewModel, contenido: @Composable (VistaDelLibro) -> Unit) {
    val obra = vm.abierto ?: return
    // Minimizado, el libro se queda en la isla (`IslaDelLector`): su contenido no se pinta, pero lo de cada vista sigue.
    if (vm.minimizado) return
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    BackHandler(onBack = vm::atras)

    Column(Modifier.fillMaxSize().background(colores.lienzo).clickable(enabled = false) {}) {
        Barra(vm, obra.nombre, obra.portada)
        Box(Modifier.weight(1f).fillMaxWidth()) {
            Box(Modifier.fillMaxSize()) { contenido(vm.vista) }
            Indice(vm, ancha)
        }
        Navegacion(vm, ancha)
    }
    HojaInferior(abierta = vm.elementosAbiertos, alCerrar = vm::cerrarElementos, titulo = "Elementos narrativos") {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) { BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarElementos) }
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Elemento.entries.forEach { elemento ->
                Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    BotonDeElemento(Modifier.weight(1f), "Abrir ${elemento.etiqueta}", { vm.ir(VistaDelLibro.DeElemento(elemento)) }) {
                        Icon(painterResource(iconoDe(elemento)), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
                        Text(elemento.etiqueta, style = Textos.cuerpo.copy(color = colores.tinta))
                    }
                    BotonDeElemento(Modifier.width(48.dp), "Crear ${elemento.etiqueta}", { vm.ir(VistaDelLibro.DeElemento(elemento, crear = true)) }, centrado = true) {
                        Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(24.dp))
                    }
                }
            }
        }
    }
    vm.estructura?.let { EditorDeEstructuraDialogo(vm, it, ancha) }
}

// --- La barra. ---

/**
 * `.m-book-bar`: la zona segura arriba, 64 dp, tres columnas alineadas abajo: minimizar, la portada y el nombre, y las
 * herramientas (estadísticas, notas, wiki y búsqueda), que se marcan cuando la persona las elige.
 */
@Composable
private fun Barra(vm: LibroViewModel, nombre: String, portada: String?) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val uri = LocalUriHandler.current
    Row(
        Modifier.fillMaxWidth().background(colores.superficie)
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .heightIn(min = Alturas.barraSuperior + zona.calculateTopPadding())
            .padding(
                start = max(Espacios.e2, zona.calculateLeftPadding(direccion)),
                end = max(Espacios.e2, zona.calculateRightPadding(direccion)),
                top = zona.calculateTopPadding(),
                bottom = Espacios.e2,
            ),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.Bottom,
    ) {
        BotonDeIcono(Iconos.keyboardArrowDown, "Minimizar libro", vm::minimizar)
        Row(
            Modifier.weight(1f).heightIn(min = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (!portada.isNullOrEmpty()) Portada(portada, null, Modifier.width(30.dp).height(42.dp).clip(RoundedCornerShape(3.dp)))
            Text(nombre, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(0.94), fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            // `.m-book-bar__saved`: 3 s tras guardar, la nube en un círculo del primario con su halo.
            if (vm.recienGuardado) {
                Box(
                    Modifier.padding(end = 2.dp).size(40.dp)
                        .drawBehind { drawCircle(mezclar(colores.primario, 0.24f), radius = size.minDimension / 2 + 3.dp.toPx()) }
                        .clip(CircleShape).background(colores.primario)
                        .semantics { contentDescription = "Guardado" },
                    contentAlignment = Alignment.Center,
                ) { Icon(painterResource(Iconos.cloudDone), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(24.dp)) }
            }
            Herramienta(Iconos.queryStats, "Estadísticas", vm.estaActiva(VistaDelLibro.Estadisticas)) { vm.ir(VistaDelLibro.Estadisticas) }
            Herramienta(Iconos.stickyNote2, "Notas del libro", vm.estaActiva(VistaDelLibro.Notas)) { vm.ir(VistaDelLibro.Notas) }
            val wiki = vm.wiki
            Herramienta(Iconos.language, if (wiki != null) "Abrir wiki del libro" else "Wiki no disponible", activa = false, habilitada = wiki != null) {
                wiki?.let { runCatching { uri.openUri(it) } }
            }
            Herramienta(Iconos.manageSearch, "Buscar dentro del libro", vm.estaActiva(VistaDelLibro.Busqueda)) { vm.ir(VistaDelLibro.Busqueda) }
        }
    }
}

/** Una herramienta de la barra: 44 dp; activa, sobre el contenedor primario; sin poder usarse, al 42 %. */
@Composable
private fun Herramienta(@DrawableRes icono: Int, descripcion: String, activa: Boolean, habilitada: Boolean = true, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.size(44.dp).clip(CircleShape)
            .background(if (activa) colores.contenedorPrimario else Color.Transparent)
            .clickable(enabled = habilitada, onClick = alPulsar)
            .semantics { contentDescription = descripcion }
            .alpha(if (habilitada) 1f else 0.42f),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = if (activa) colores.primario else colores.tinta, modifier = Modifier.size(24.dp))
    }
}

// --- El índice. ---

/**
 * `.m-book-index`: por encima del contenido, sobre el velo, de hasta 360 dp (400 desde 600 dp). Entra desde la izquierda
 * y se cierra tocando fuera, con Atrás o arrastrándolo hacia un lado más de 72 dp.
 */
@Composable
private fun Indice(vm: LibroViewModel, ancha: Boolean) {
    val colores = LocalColores.current
    val densidad = LocalDensity.current
    BackHandler(enabled = vm.indiceAbierto, onBack = vm::cerrarIndice)
    var arrastre by remember { mutableFloatStateOf(0f) }
    var arrastrando by remember { mutableStateOf(false) }
    var cerrando by remember { mutableStateOf(false) }
    LaunchedEffect(vm.indiceAbierto) { if (vm.indiceAbierto) { arrastre = 0f; cerrando = false } }
    val desplazamiento by animateFloatAsState(arrastre, if (arrastrando) snap() else tween(180), label = "indice") { if (cerrando) vm.cerrarIndice() }

    if (vm.indiceAbierto) {
        Box(Modifier.fillMaxSize().background(colores.velo).clickable(remember { MutableInteractionSource() }, indication = null, onClick = vm::cerrarIndice))
    }
    AnimatedVisibility(vm.indiceAbierto, enter = fadeIn(tween(180)) + slideInHorizontally(tween(180)) { -with(densidad) { 24.dp.roundToPx() } }, exit = fadeOut(tween(0))) {
        BoxWithConstraints(Modifier.fillMaxHeight()) {
            val ancho = min(maxWidth * (if (ancha) 0.48f else 0.88f), if (ancha) 400.dp else 360.dp)
            Column(
                Modifier.width(ancho).fillMaxHeight()
                    .offset { IntOffset(desplazamiento.roundToInt(), 0) }
                    .sombra2(RoundedCornerShape(0.dp), colores)
                    .background(colores.superficie)
                    .drawBehind { drawRect(colores.contorno, Offset(size.width - 1.dp.toPx(), 0f), Size(1.dp.toPx(), size.height)) }
                    .clickable(remember { MutableInteractionSource() }, indication = null) {}
                    .draggable(
                        rememberDraggableState { delta -> arrastrando = true; arrastre += delta },
                        Orientation.Horizontal,
                        onDragStopped = {
                            arrastrando = false
                            if (with(densidad) { abs(arrastre).toDp() } >= ArrastreParaCerrar) {
                                cerrando = true
                                arrastre = sign(if (arrastre == 0f) -1f else arrastre) * with(densidad) { maxWidth.toPx() }
                            } else {
                                arrastre = 0f
                            }
                        },
                    )
                    .padding(horizontal = Espacios.e3, vertical = Espacios.e4)
                    .semantics { contentDescription = "Índice del libro" },
            ) {
                EstadoDelIndice(vm)
                Column(
                    Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(top = Espacios.e3),
                    verticalArrangement = Arrangement.spacedBy(Espacios.e2),
                ) {
                    if (vm.indice.isEmpty()) {
                        Column(Modifier.fillMaxWidth().heightIn(min = 180.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                            Icon(painterResource(Iconos.menuBook), contentDescription = null, tint = colores.primario, modifier = Modifier.size(40.dp))
                            Text("El índice todavía está vacío.", style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center))
                        }
                    } else {
                        vm.indice.forEach { EntradaDelIndiceVista(vm, it, anidada = false) }
                    }
                }
            }
        }
    }
}

/** `.m-book-index__status`: «Poner en marcha» o, ya en marcha, crear capítulo, parte o interludio. */
@Composable
private fun EstadoDelIndice(vm: LibroViewModel) {
    val colores = LocalColores.current
    Box(
        Modifier.fillMaxWidth().heightIn(min = 76.dp)
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .padding(bottom = Espacios.e3),
        contentAlignment = Alignment.Center,
    ) {
        if (!vm.enMarcha) {
            Boton("Poner en marcha", vm::ponerEnMarcha, Modifier.fillMaxWidth(), icono = Iconos.autoStories, habilitado = !vm.poniendoEnMarcha)
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                AccionDelIndice(Iconos.noteAdd, "Capítulo", Modifier.weight(1f)) { vm.ir(VistaDelLibro.NuevoCapitulo) }
                AccionDelIndice(Iconos.segment, "Parte", Modifier.weight(1f)) { vm.abrirEstructura(TipoDeGrupo.PARTE) }
                AccionDelIndice(Iconos.autoStories, "Interludio", Modifier.weight(1f)) { vm.abrirEstructura(TipoDeGrupo.INTERLUDIO) }
            }
        }
    }
}

@Composable
private fun AccionDelIndice(@DrawableRes icono: Int, texto: String, modifier: Modifier, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(
        modifier.heightIn(min = 64.dp).clip(forma).background(colores.contenedorPrimario)
            .border(1.dp, mezclar(colores.primario, 0.34f, colores.contorno), forma)
            .clickable(onClick = alPulsar)
            .padding(horizontal = 2.dp, vertical = Espacios.e2),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp, Alignment.CenterVertically),
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
        Text(texto, style = Textos.cuerpo.copy(fontSize = rem(0.67), fontWeight = FontWeight.ExtraBold, color = colores.primario), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun EntradaDelIndiceVista(vm: LibroViewModel, entrada: EntradaDelIndice, anidada: Boolean) {
    when (entrada) {
        is EntradaDelIndice.DeCapitulo -> FilaDeCapitulo(vm, entrada.capitulo, entrada.deInterludio)
        is EntradaDelIndice.Grupo -> GrupoDelIndice(vm, entrada, anidada)
    }
}

/** `.m-book-chapter`: el orden en un círculo y el nombre; el abierto, sobre el contenedor primario. */
@Composable
private fun FilaDeCapitulo(vm: LibroViewModel, capitulo: Capitulo, deInterludio: Boolean) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val vista = VistaDelLibro.DeCapitulo(capitulo.id, deInterludio)
    val activa = vm.vista == vista
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(forma)
            .background(if (activa) colores.contenedorPrimario else Color.Transparent)
            .border(1.dp, if (activa) mezclar(colores.primario, 0.45f) else Color.Transparent, forma)
            .clickable { vm.ir(vista) }
            .padding(Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Sin número («Epílogo»), el nombre ocupa también la columna del círculo, como en la rejilla de CSS.
        IndiceDelLibro.etiquetaDeOrden(capitulo, vm.ordenMaximo)?.let { orden ->
            Box(Modifier.width(32.dp)) {
                Box(Modifier.size(28.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
                    Text(orden.toString(), style = Textos.cuerpo.copy(fontSize = rem(0.7), color = colores.primario))
                }
            }
        }
        Text(IndiceDelLibro.titulo(capitulo), style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), modifier = Modifier.weight(1f))
    }
}

/** `.m-book-group`: una parte o un interludio, con su raya a la izquierda y sus capítulos dentro. */
@Composable
private fun GrupoDelIndice(vm: LibroViewModel, grupo: EntradaDelIndice.Grupo, anidada: Boolean) {
    val colores = LocalColores.current
    val interludio = grupo.tipo == TipoDeGrupo.INTERLUDIO
    val raya = if (interludio) colores.secundario else colores.primario
    Column(
        Modifier.fillMaxWidth().padding(top = if (anidada) Espacios.e2 else 0.dp)
            .clip(RoundedCornerShape(topEnd = Radios.sm, bottomEnd = Radios.sm))
            .background(if (anidada) colores.superficie else colores.superficieContenedor)
            .drawBehind { drawRect(raya, Offset.Zero, Size(3.dp.toPx(), size.height)) }
            .padding(start = Espacios.e2 + 3.dp, end = Espacios.e2, top = Espacios.e2, bottom = Espacios.e2),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(28.dp)) {
                Icon(painterResource(if (interludio) Iconos.autoStories else Iconos.segment), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            }
            Text(grupo.nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta), modifier = Modifier.weight(1f))
            if (interludio) BotonDeIcono(Iconos.add, "Nuevo capítulo de interludio", { vm.ir(VistaDelLibro.NuevoCapituloDeInterludio(grupo.id)) }, Modifier.size(44.dp))
            BotonDeIcono(Iconos.edit, if (interludio) "Editar interludio" else "Editar parte", { vm.abrirEstructura(grupo.tipo, grupo.id) }, Modifier.size(44.dp))
        }
        grupo.entradas.forEach { EntradaDelIndiceVista(vm, it, anidada = true) }
    }
}

// --- La navegación de abajo. ---

/**
 * `.m-book-navigation`: 64 dp más la zona segura. En el móvil, Índice y Elementos; desde 600 dp, Índice y los seis
 * elementos, que abren su lista.
 */
@Composable
private fun Navegacion(vm: LibroViewModel, ancha: Boolean) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    BoxWithConstraints(
        Modifier.fillMaxWidth()
            .drawBehind { drawRect(colores.contorno, Offset.Zero, Size(size.width, 1.dp.toPx())) }
            .background(mezclar(colores.superficie, 0.96f))
            .heightIn(min = 64.dp + zona.calculateBottomPadding()),
    ) {
        val lados = if (ancha) Espacios.e2 else max(Espacios.e2, zona.calculateLeftPadding(direccion))
        Row(
            Modifier.fillMaxWidth().padding(start = lados, end = lados, top = 4.dp, bottom = max(4.dp, zona.calculateBottomPadding())),
            horizontalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            BotonDeNavegacion(Iconos.formatListBulleted, "Índice", vm.indiceAbierto, Modifier.weight(1f), vm::alternarIndice)
            if (ancha) {
                Elemento.entries.forEach { elemento ->
                    val activa = vm.vista == VistaDelLibro.DeElemento(elemento) || vm.vista == VistaDelLibro.DeElemento(elemento, crear = true)
                    BotonDeNavegacion(iconoDe(elemento), elemento.etiqueta, activa, Modifier.weight(1f)) { vm.ir(VistaDelLibro.DeElemento(elemento)) }
                }
            } else {
                BotonDeNavegacion(Iconos.category, "Elementos", vm.elementosAbiertos, Modifier.weight(1f), vm::alternarElementos)
            }
        }
    }
}

@Composable
private fun BotonDeNavegacion(@DrawableRes icono: Int, texto: String, activo: Boolean, modifier: Modifier, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val tinta = if (activo) colores.primario else colores.tintaSuave
    Column(
        modifier.heightIn(min = 56.dp).clip(RoundedCornerShape(Radios.lg)).clickable(onClick = alPulsar).padding(3.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically),
    ) {
        Box(
            Modifier.width(if (activo) 48.dp else 24.dp).height(24.dp).clip(Radios.pildora)
                .background(if (activo) colores.contenedorPrimario else Color.Transparent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(painterResource(icono), contentDescription = null, tint = tinta, modifier = Modifier.size(24.dp))
        }
        Text(texto, style = Textos.cuerpo.copy(fontSize = rem(0.66), fontWeight = FontWeight.Bold, color = tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Un botón de la hoja de Elementos: 52 dp, con borde, sobre la superficie. */
@Composable
private fun BotonDeElemento(modifier: Modifier, descripcion: String, alPulsar: () -> Unit, centrado: Boolean = false, contenido: @Composable () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        modifier.heightIn(min = 52.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)
            .clickable(onClick = alPulsar).semantics { contentDescription = descripcion }
            .padding(if (centrado) 0.dp else Espacios.e3),
        horizontalArrangement = if (centrado) Arrangement.Center else Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) { contenido() }
}

// --- El editor de partes e interludios. ---

/**
 * `.m-book-structure-dialog`: una hoja desde abajo en el móvil y un diálogo centrado de 620 dp, en dos columnas, desde
 * 600 dp. Nombre y página; de una parte, sus órdenes; de un interludio, el capítulo o la parte que lo preceden.
 */
@Composable
private fun EditorDeEstructuraDialogo(vm: LibroViewModel, editor: EditorDeEstructura, ancha: Boolean) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    BackHandler(onBack = vm::cerrarEstructura)
    Box(
        Modifier.fillMaxSize().background(colores.velo)
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = vm::cerrarEstructura)
            .padding(if (ancha) Espacios.e6 else 0.dp),
        contentAlignment = if (ancha) Alignment.Center else Alignment.BottomCenter,
    ) {
        val forma = if (ancha) RoundedCornerShape(Radios.lg) else RoundedCornerShape(topStart = Radios.xl, topEnd = Radios.xl)
        Column(
            Modifier.then(if (ancha) Modifier.widthIn(max = 620.dp) else Modifier).fillMaxWidth()
                .sombra2(forma, colores).clip(forma).background(colores.superficie)
                .clickable(remember { MutableInteractionSource() }, indication = null) {}
                .verticalScroll(rememberScrollState())
                .padding(start = Espacios.e6, end = Espacios.e6, top = Espacios.e6, bottom = Espacios.e6 + if (ancha) 0.dp else zona.calculateBottomPadding()),
            verticalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("ESTRUCTURA", style = Textos.eyebrow.copy(color = colores.primario))
                    Spacer(Modifier.height(Espacios.e2))
                    Text(editor.titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.5), color = colores.tinta))
                }
                BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarEstructura)
            }
            val campos: List<@Composable (Modifier) -> Unit> = buildList {
                add { m -> CampoDeEstructura("Nombre", editor.nombre, { vm.cambiarEstructura(editor.copy(nombre = it)) }, m) }
                add { m -> CampoDeEstructura("Página", editor.pagina, { vm.cambiarEstructura(editor.copy(pagina = it.filter(Char::isDigit))) }, m, numerico = true) }
                if (editor.tipo == TipoDeGrupo.PARTE) {
                    add { m -> CampoDeEstructura("Orden inicial", editor.ordenInicio, { vm.cambiarEstructura(editor.copy(ordenInicio = it.filter(Char::isDigit))) }, m, numerico = true) }
                    add { m -> CampoDeEstructura("Orden final", editor.ordenFinal, { vm.cambiarEstructura(editor.copy(ordenFinal = it.filter(Char::isDigit))) }, m, numerico = true) }
                } else {
                    add { m -> CampoDeEstructura("Orden capítulo predecesor", editor.ordenCapituloPredecesor, { vm.cambiarEstructura(editor.copy(ordenCapituloPredecesor = it.filter { c -> c.isDigit() || c == '-' })) }, m, numerico = true) }
                    add { m -> SelectorDeParte(vm, editor, m) }
                }
            }
            if (ancha) {
                campos.chunked(2).forEach { fila ->
                    Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) { fila.forEach { it(Modifier.weight(1f)) } }
                }
            } else {
                campos.forEach { it(Modifier.fillMaxWidth()) }
            }
            Row(Modifier.fillMaxWidth().padding(top = Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                Boton("Cancelar", vm::cerrarEstructura, variante = VarianteDeBoton.Contorno)
                Spacer(Modifier.weight(1f))
                Boton("Guardar", vm::guardarEstructura, habilitado = editor.valido && !vm.guardandoEstructura)
            }
        }
    }
}

@Composable
private fun CampoDeEstructura(etiqueta: String, valor: String, alCambiar: (String) -> Unit, modifier: Modifier, numerico: Boolean = false) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(etiqueta, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        BasicTextField(
            value = valor,
            onValueChange = alCambiar,
            singleLine = true,
            textStyle = Textos.cuerpo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = if (numerico) KeyboardType.Number else KeyboardType.Text),
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = etiqueta },
            decorationBox = { campo ->
                Box(Modifier.fillMaxWidth().heightIn(min = 56.dp).background(colores.superficie, forma).border(1.dp, colores.contornoFuerte, forma).padding(horizontal = Espacios.e4), contentAlignment = Alignment.CenterStart) { campo() }
            },
        )
    }
}

/** «Parte predecesora»: sin parte o una de las del libro. */
@Composable
private fun SelectorDeParte(vm: LibroViewModel, editor: EditorDeEstructura, modifier: Modifier) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    var abierto by remember { mutableStateOf(false) }
    val partes = vm.libro?.partes.orEmpty()
    val actual = partes.firstOrNull { it.id == editor.idPartePredecesor }?.nombre ?: "Sin parte"
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Parte predecesora", style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        Box {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contornoFuerte, forma)
                    .clickable { abierto = true }.padding(horizontal = Espacios.e4),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(actual, style = Textos.cuerpo.copy(color = colores.tinta), modifier = Modifier.weight(1f))
                Icon(painterResource(Iconos.expandMore), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(24.dp))
            }
            DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
                (listOf<Pair<Int?, String>>(null to "Sin parte") + partes.map { it.id to it.nombre }).forEach { (id, nombre) ->
                    DropdownMenuItem(text = { Text(nombre, style = Textos.cuerpo.copy(color = colores.tinta)) }, onClick = {
                        abierto = false
                        vm.cambiarEstructura(editor.copy(idPartePredecesor = id))
                    })
                }
            }
        }
    }
}

/**
 * Lo que enseña el contenido mientras no está clonado: el nombre de la vista y en qué paso llega.
 *
 * TODO(clon): los
 * elementos, en el hito 10.
 */
@Composable
fun ContenidoPendiente(vista: VistaDelLibro) {
    val colores = LocalColores.current
    val nombre = when (vista) {
        VistaDelLibro.Estadisticas -> "Las estadísticas del libro"
        VistaDelLibro.Notas -> "Las notas del libro"
        VistaDelLibro.Busqueda -> "La búsqueda dentro del libro"
        is VistaDelLibro.DeCapitulo, VistaDelLibro.NuevoCapitulo, is VistaDelLibro.NuevoCapituloDeInterludio -> "Los capítulos y las escenas"
        is VistaDelLibro.DeElemento -> vista.elemento.etiqueta
    }
    Column(Modifier.fillMaxSize().padding(Espacios.e6), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(painterResource(Iconos.menuBook), contentDescription = null, tint = colores.primario, modifier = Modifier.size(40.dp))
        Text(nombre, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.2), color = colores.tinta, textAlign = TextAlign.Center), modifier = Modifier.padding(top = Espacios.e3))
        Text(if (vista is VistaDelLibro.DeElemento) "Llegan en el hito 10 del clon." else "Llegan en el hito 9 del clon.", style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center))
    }
}

/** Lo que enseña el contenido del libro en cada vista (`app-book-router`). */
@Composable
fun ContenidoDelLibro(
    vm: LibroViewModel,
    notas: NotasViewModel,
    busqueda: BusquedaViewModel,
    capitulo: @Composable (VistaDelLibro) -> CapituloViewModel,
    vista: VistaDelLibro,
) {
    when (vista) {
        is VistaDelLibro.DeCapitulo, VistaDelLibro.NuevoCapitulo, is VistaDelLibro.NuevoCapituloDeInterludio -> PantallaCapitulo(vm, vista, capitulo(vista))
        VistaDelLibro.Estadisticas -> PantallaResumenDelLibro(vm)
        VistaDelLibro.Notas -> PantallaNotasDelLibro(vm.abierto?.id ?: 0, notas)
        VistaDelLibro.Busqueda -> PantallaBusquedaDelLibro(vm, busqueda)
        else -> ContenidoPendiente(vista)
    }
}
