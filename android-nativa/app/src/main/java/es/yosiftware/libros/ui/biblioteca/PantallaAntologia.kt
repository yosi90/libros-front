package es.yosiftware.libros.ui.biblioteca

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.TextoEyebrow
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
import es.yosiftware.libros.ui.tema.sombra1

/**
 * Las secciones de una antología de la Biblioteca (`.m-anthology`, a pantalla completa): la barra con su portada y su
 * nombre; los autores, cuántas secciones tiene y sus tres acciones (Ficha, Mi lectura, Similares); y la lista de
 * secciones con sus páginas y su progreso. Cada sección se abre, o se edita con el botón de los tres puntos.
 */
@Composable
fun PantallaAntologia(
    vm: BibliotecaViewModel,
    antologia: Obra,
    alAbrirSeccion: (Obra) -> Unit,
    alVerFicha: (Obra) -> Unit,
    alBuscarSimilares: (Obra) -> Unit,
) {
    val colores = LocalColores.current
    val ventana = LocalVentana.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val ancha = ventana.anchoDp >= 600
    BackHandler(onBack = vm::cerrarAntologia)

    Column(Modifier.fillMaxSize().background(colores.lienzo).clickable(enabled = false) {}) {
        // La barra (`.m-fullscreen-surface__bar`): volver | portada y nombre | hueco.
        Row(
            Modifier.fillMaxWidth().background(colores.superficie)
                .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                .heightIn(min = Alturas.barraSuperior + zona.calculateTopPadding())
                .padding(
                    start = maxOf(Espacios.e3, zona.calculateLeftPadding(direccion)),
                    end = maxOf(Espacios.e3, zona.calculateRightPadding(direccion)),
                    top = zona.calculateTopPadding(),
                    bottom = Espacios.e2,
                ),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
            verticalAlignment = Alignment.Bottom,
        ) {
            BotonDeIcono(Iconos.arrowBack, "Volver a la biblioteca", vm::cerrarAntologia)
            Row(
                Modifier.weight(1f).align(Alignment.CenterVertically),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val forma = RoundedCornerShape(4.dp)
                Portada(antologia.portada, null, Modifier.width(28.dp).height(40.dp).sombra1(forma, colores).clip(forma))
                Text(
                    antologia.nombre,
                    style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(0.95), fontWeight = FontWeight.Bold, color = colores.tinta),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.size(48.dp))
        }

        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            Column(
                Modifier.widthIn(max = 760.dp).fillMaxWidth().verticalScroll(rememberScrollState())
                    .padding(
                        start = if (ancha) Espacios.e6 else Espacios.e4,
                        end = if (ancha) Espacios.e6 else Espacios.e4,
                        top = if (ancha) Espacios.e6 else Espacios.e5,
                        bottom = maxOf(if (ancha) Espacios.e6 else Espacios.e8, zona.calculateBottomPadding()),
                    ),
            ) {
                Cabecera(antologia, vm, ancha, alVerFicha, alBuscarSimilares)
                when {
                    vm.cargandoAntologia && vm.secciones.isEmpty() -> Column(
                        Modifier.fillMaxWidth().padding(top = Espacios.e6).heightIn(min = 220.dp).padding(Espacios.e6),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Rueda(36.dp, 3.dp)
                        Text("Cargando secciones…", style = Textos.cuerpo.copy(color = colores.tintaSuave), modifier = Modifier.padding(top = Espacios.e2))
                    }
                    vm.falloAntologia && vm.secciones.isEmpty() -> EstadoDeAntologia(Iconos.cloudOff, "No pudimos cargar las secciones", "Comprueba la conexión e inténtalo de nuevo.") {
                        Boton("Reintentar", vm::reintentarAntologia, variante = VarianteDeBoton.Tonal)
                    }
                    vm.secciones.isNotEmpty() -> {
                        val columnas = if (ancha) 2 else 1
                        Column(Modifier.fillMaxWidth().padding(top = Espacios.e6), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                            vm.secciones.withIndex().chunked(columnas).forEach { fila ->
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                                    fila.forEach { (indice, seccion) ->
                                        TarjetaDeSeccion(seccion, indice + 1, vm, Modifier.weight(1f)) { alAbrirSeccion(seccion) }
                                    }
                                    repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
                                }
                            }
                        }
                        if (vm.falloAntologia) {
                            Box(
                                Modifier.align(Alignment.CenterHorizontally).padding(top = Espacios.e4).heightIn(min = 44.dp).clip(Radios.pildora)
                                    .clickable(onClick = vm::reintentarAntologia).padding(horizontal = Espacios.e4),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("Actualizar secciones", style = Textos.cuerpo.copy(fontWeight = FontWeight.ExtraBold, color = colores.primario))
                            }
                        }
                    }
                    else -> EstadoDeAntologia(Iconos.autoStories, "Esta antología no tiene secciones disponibles", null) {}
                }
            }
        }
    }
}

/** `.m-anthology__hero`: «Antología», sus autores, cuántas secciones y las tres acciones; en dos columnas desde 600 dp. */
@Composable
private fun Cabecera(antologia: Obra, vm: BibliotecaViewModel, ancha: Boolean, alVerFicha: (Obra) -> Unit, alBuscarSimilares: (Obra) -> Unit) {
    val colores = LocalColores.current
    val datos: @Composable (Modifier) -> Unit = { m ->
        Column(m) {
            TextoEyebrow("Antología")
            if (antologia.autores.isNotEmpty()) TextoDeApoyo(antologia.autores.joinToString(", ") { it.nombre }, Modifier.padding(top = Espacios.e2))
            if (vm.secciones.isNotEmpty()) {
                Text(etiquetaDeTitulos(vm.secciones.size), style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.ExtraBold, color = colores.primario), modifier = Modifier.padding(top = Espacios.e3))
            }
        }
    }
    val acciones: @Composable (Modifier) -> Unit = { m ->
        Row(m.semantics { contentDescription = "Acciones de la antología" }, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            AccionDeAntologia(Iconos.visibility, "Ficha", Modifier.weight(1f)) { alVerFicha(antologia) }
            AccionDeAntologia(Iconos.edit, "Mi lectura", Modifier.weight(1f), vm::editarAntologia)
            AccionDeAntologia(Iconos.autoAwesome, "Similares", Modifier.weight(1f)) { alBuscarSimilares(antologia) }
        }
    }
    if (ancha) {
        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e4), verticalAlignment = Alignment.CenterVertically) {
            datos(Modifier.weight(0.7f).widthIn(min = 180.dp))
            acciones(Modifier.weight(1.3f).widthIn(min = 360.dp))
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
            datos(Modifier.fillMaxWidth())
            acciones(Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun AccionDeAntologia(icono: Int, texto: String, modifier: Modifier, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        modifier.heightIn(min = 52.dp).clip(forma).background(colores.contenedorPrimario)
            .border(1.dp, mezclar(colores.primario, 0.22f, colores.contorno), forma)
            .clickable(onClick = alPulsar).padding(Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
        Text(texto, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, lineHeight = 1.1.em, color = colores.primario), maxLines = 1)
    }
}

/** `.m-anthology__section`: portada de 60 dp, «Sección N», su nombre, sus páginas, lo leído y el botón de su estado. */
@Composable
private fun TarjetaDeSeccion(seccion: Obra, numero: Int, vm: BibliotecaViewModel, modifier: Modifier, alAbrir: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    val progreso = progresoDeSeccion(seccion)
    val leyendo = vm.leyendoSeccionId == seccion.id
    Box(
        modifier.heightIn(min = 104.dp).sombra1(forma, colores).clip(forma).background(colores.superficie)
            .degradadoCss(105f, 0f to mezclar(colores.primario, 0.07f), 0.52f to Color.Transparent)
            .border(1.dp, mezclar(colores.contorno, 0.78f), forma)
            .clickable(onClick = alAbrir)
            .semantics { contentDescription = "Leer ${seccion.nombre}" },
    ) {
        Row(Modifier.fillMaxWidth().heightIn(min = 104.dp), horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
            Portada(seccion.portada, null, Modifier.width(60.dp).fillMaxHeight().heightIn(min = 104.dp))
            Column(Modifier.weight(1f).padding(vertical = Espacios.e2), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("SECCIÓN $numero", style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.08.em, color = colores.primario))
                Text(seccion.nombre, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.0), fontWeight = FontWeight.Bold, lineHeight = 1.15.em, color = colores.tinta), maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(etiquetaDePaginasDeSeccion(seccion), style = Textos.cuerpo.copy(fontSize = rem(0.72), color = colores.tintaSuave))
                if (progreso > 0) Text("${numero(progreso)}% leído", style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.Bold, color = colores.primario))
            }
            Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                if (leyendo) {
                    Box(Modifier.semantics { contentDescription = "Cargando estado" }) { Rueda(22.dp, 2.dp) }
                } else {
                    BotonDeIcono(Iconos.moreHoriz, "Modificar estado y puntuación de la sección", { vm.gestionarSeccion(seccion) }, habilitado = vm.leyendoSeccionId == null)
                }
            }
        }
        if (progreso > 0) {
            Box(Modifier.align(Alignment.BottomStart).padding(start = 60.dp).fillMaxWidth().height(3.dp).background(colores.superficieAlta)) {
                Box(Modifier.fillMaxWidth((progreso / 100).toFloat()).fillMaxHeight().background(colores.primario))
            }
        }
    }
}

/** `.m-anthology__state` (una `.m-card`): icono de 40 dp, título, explicación y, si la hay, la acción. */
@Composable
private fun EstadoDeAntologia(icono: Int, titulo: String, texto: String?, accion: @Composable () -> Unit) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth().padding(top = Espacios.e6)) {
        Column(
            Modifier.fillMaxWidth().heightIn(min = 188.dp).padding(Espacios.e6 - Espacios.e4),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterVertically),
        ) {
            Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(40.dp))
            Text(titulo, style = Textos.cuerpo.copy(fontSize = rem(1.25), fontWeight = FontWeight.Medium, color = colores.tinta, textAlign = TextAlign.Center))
            texto?.let { Text(it, style = Textos.cuerpo.copy(color = colores.tintaSuave, textAlign = TextAlign.Center)) }
            accion()
        }
    }
}
