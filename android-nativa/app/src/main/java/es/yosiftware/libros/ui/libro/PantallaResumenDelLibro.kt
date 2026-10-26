package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.RitmoDelLibro
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.layout
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.EstadisticasDelLibro
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.biblioteca.degradadoCss
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import java.time.LocalDate

// El resumen del libro, la primera pantalla al abrirlo: src/app/components/mobile/book/mobile-book-statistics-view/ en
// su versión de la APK de Capacitor (5dc3120). «Tu lectura» (compacta desde el 26/10/2026: el progreso, las fechas con
// dato y tu ritmo), las cifras, los personajes destacados y los cuatro gráficos.

@Composable
fun PantallaResumenDelLibro(vm: LibroViewModel) {
    val colores = LocalColores.current
    val libro = vm.libro
    if (libro == null) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(painterResource(Iconos.analytics), contentDescription = null, tint = colores.primario, modifier = Modifier.size(44.dp))
            Text("Abre un libro para ver sus estadísticas.", style = Textos.cuerpo.copy(color = colores.tintaSuave))
        }
        return
    }
    val resumen = remember(libro) { EstadisticasDelLibro.de(libro) }
    val ventana = LocalVentana.current
    val ancha = ventana.anchoDp >= 600
    val muyAncha = ventana.anchoDp >= 900
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.widthIn(max = 920.dp).fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(start = if (ancha) Espacios.e6 else 0.dp, end = if (ancha) Espacios.e6 else 0.dp, top = if (ancha) Espacios.e5 else 0.dp, bottom = Espacios.e8),
        ) {
            TuLectura(vm, libro, resumen, ancha)
            Cifras(resumen, ancha)
            Destacados(resumen, ancha)
            Graficos(libro, resumen, ancha, muyAncha)
        }
    }
}

/** `.m-book-stats__summary`: el degradado del contenedor primario, el progreso, las fechas con dato y tu ritmo. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TuLectura(vm: LibroViewModel, libro: Libro, resumen: EstadisticasDelLibro, ancha: Boolean) {
    val colores = LocalColores.current
    val forma = if (ancha) RoundedCornerShape(topStart = Radios.xl, topEnd = Radios.xl) else RoundedCornerShape(0.dp)
    val terminado = ResumenDelLibro.leido(libro) != null
    val progreso = ResumenDelLibro.progreso(libro, resumen, terminado)
    Column(
        Modifier.fillMaxWidth().clip(forma)
            .degradadoCss(145f, 0f to mezclar(colores.contenedorPrimario, 0.52f), 0.72f to Color.Transparent)
            .then(if (ancha) Modifier.border(1.dp, colores.contorno, forma) else Modifier.drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) })
            .padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e5, bottom = Espacios.e5),
    ) {
        Row(Modifier.heightIn(min = 44.dp).padding(bottom = Espacios.e4), horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(36.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.insights), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
            }
            Text("Tu lectura", style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.08), color = colores.tinta))
        }
        // Compacta (opción A del propietario, 26/10/2026): lo que no tiene dato no ocupa sitio.
        if (progreso.pagina > 0) {
            val conTotal = progreso.porcentaje != null && progreso.total != null
            val fuerte = SpanStyle(fontWeight = FontWeight.Bold, color = colores.tinta)
            Text(
                buildAnnotatedString {
                    if (conTotal) {
                        append("Pág. ")
                        withStyle(fuerte) { append(progreso.pagina.toString()) }
                        append(" de ${progreso.total} · ")
                        withStyle(fuerte) { append("${progreso.porcentaje} %") }
                    } else {
                        append("Vas por la página ")
                        withStyle(fuerte) { append(progreso.pagina.toString()) }
                    }
                },
                style = Textos.cuerpo.copy(fontSize = rem(0.86), color = colores.tintaSuave),
            )
            if (conTotal) BarraDeProgreso(progreso.porcentaje ?: 0, Modifier.padding(top = Espacios.e2))
        }
        val hitos = ResumenDelLibro.hitos(libro)
        val estado = ResumenDelLibro.estadoSinFecha(libro)
        if (hitos.isNotEmpty() || estado.isNotEmpty()) {
            FlowRow(
                Modifier.fillMaxWidth().padding(top = Espacios.e3),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                verticalArrangement = Arrangement.spacedBy(Espacios.e1),
            ) {
                hitos.forEach { hito ->
                    Text(
                        buildAnnotatedString {
                            withStyle(SpanStyle(color = colores.tintaSuave)) { append(hito.nombre) }
                            append(" ${hito.fecha}")
                            if (hito.detalle.isNotEmpty()) append(" · ${hito.detalle}")
                        },
                        style = Textos.cuerpo.copy(fontSize = rem(0.8), color = colores.tinta),
                    )
                }
                if (estado.isNotEmpty()) Text(estado, style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.Bold, color = colores.primario))
            }
        }
        if (ResumenDelLibro.comprado(libro) == null) FechaDeCompra(vm)
        libro.metricas?.ritmo?.let { ritmo ->
            CifrasDelRitmo(ritmo)
            ResumenDelLibro.comparacionDeRitmo(ritmo).takeIf { it.isNotEmpty() }?.let {
                Text(it, style = Textos.cuerpo.copy(fontSize = rem(0.72), color = colores.tintaSuave), modifier = Modifier.padding(top = Espacios.e2))
            }
        }
    }
}

/** `.m-book-stats__bar`: lo leído, en una barra de 8 dp. */
@Composable
private fun BarraDeProgreso(porcentaje: Int, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    Box(modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(colores.superficieAlta)) {
        Box(Modifier.fillMaxWidth(porcentaje.coerceIn(0, 100) / 100f).fillMaxHeight().clip(RoundedCornerShape(50)).background(colores.primario))
    }
}

/** `.m-book-stats__pace`: las cuatro cifras de tu ritmo en este libro, en una fila (dos por debajo de 360 dp). */
@Composable
private fun CifrasDelRitmo(ritmo: RitmoDelLibro) {
    val colores = LocalColores.current
    val cifras = listOf(
        "Págs./día" to ResumenDelLibro.hastaUnDecimal(ritmo.paginasPorDia),
        "Días" to ritmo.diasActivos.toString(),
        "Mejor día" to ResumenDelLibro.mejorDia(ritmo),
        "Tu media" to (ritmo.mediaPersonalPorDia?.let(ResumenDelLibro::hastaUnDecimal) ?: "—"),
    )
    Column(
        Modifier.fillMaxWidth().padding(top = Espacios.e3)
            .drawBehind { drawRect(colores.contorno, Offset.Zero, Size(size.width, 1.dp.toPx())) }
            .padding(top = Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        cifras.chunked(if (LocalVentana.current.anchoDp < 360) 2 else 4).forEach { fila ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                fila.forEach { (nombre, valor) ->
                    Column(Modifier.weight(1f)) {
                        Text(nombre.uppercase(), style = Textos.cuerpo.copy(fontSize = rem(0.67), fontWeight = FontWeight.Bold, color = colores.tintaSuave))
                        Text(valor, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(0.95), color = colores.tinta), modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }
        }
    }
}

/** «Añadir fecha de compra»: abre el calendario de Android (en la web, un `input type="date"`). */
@Composable
private fun FechaDeCompra(vm: LibroViewModel) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    Row(
        Modifier.padding(top = Espacios.e2).heightIn(min = 44.dp).clip(RoundedCornerShape(Radios.sm))
            .clickable(enabled = !vm.guardandoCompra, role = Role.Button) {
                val hoy = LocalDate.now()
                DatePickerDialog(contexto, { _, anio, mes, dia -> vm.ponerFechaDeCompra(LocalDate.of(anio, mes + 1, dia)) }, hoy.year, hoy.monthValue - 1, hoy.dayOfMonth).show()
            }
            .padding(horizontal = Espacios.e1),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.calendarToday), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
        Text("Añadir fecha de compra", style = Textos.cuerpo.copy(fontSize = rem(0.76), fontWeight = FontWeight.Bold, color = colores.primario))
    }
}

/** `.m-book-stats__metrics`: seis cifras en tres columnas (seis desde 600 dp), separadas por rayas de 1 dp. */
@Composable
private fun Cifras(resumen: EstadisticasDelLibro, ancha: Boolean) {
    val colores = LocalColores.current
    val media = ResumenDelLibro.paginasPorCapitulo(resumen)
    val cifras = listOf(
        Triple(Iconos.menuBook, resumen.capitulos.size.toString(), "Capítulos"),
        Triple(Iconos.movieFilter, ResumenDelLibro.escenas(resumen).toString(), "Escenas"),
        Triple(Iconos.autoStories, media?.let(ResumenDelLibro::decimal) ?: "—", "Págs. por capítulo"),
        Triple(Iconos.theaterComedy, resumen.personajes.size.toString(), "Personajes"),
        Triple(Iconos.groups, ResumenDelLibro.apariciones(resumen).toString(), "Apariciones"),
        Triple(Iconos.recordVoiceOver, ResumenDelLibro.menciones(resumen).toString(), "Menciones"),
    )
    val forma = RoundedCornerShape(Radios.lg)
    Column(
        Modifier.padding(start = if (ancha) 0.dp else Espacios.e4, end = if (ancha) 0.dp else Espacios.e4, top = Espacios.e4)
            .fillMaxWidth().clip(forma).background(colores.contorno).border(1.dp, colores.contorno, forma).padding(1.dp),
        verticalArrangement = Arrangement.spacedBy(1.dp),
    ) {
        cifras.chunked(if (ancha) 6 else 3).forEach { fila ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                fila.forEach { (icono, valor, nombre) ->
                    Column(
                        Modifier.weight(1f).fillMaxHeight().heightIn(min = 104.dp).background(mezclar(colores.superficie, 0.94f, colores.contorno)).padding(Espacios.e2),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically),
                    ) {
                        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.padding(bottom = 2.dp).size(20.dp))
                        Text(valor, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.24), fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(nombre, style = Textos.cuerpo.copy(fontSize = rem(0.64), lineHeight = 1.2.em, color = colores.tintaSuave, textAlign = TextAlign.Center))
                    }
                }
            }
        }
    }
}

/** `.m-book-stats__highlights`: el más presente y el más nombrado, si los hay. */
@Composable
private fun Destacados(resumen: EstadisticasDelLibro, ancha: Boolean) {
    val colores = LocalColores.current
    val presente = ResumenDelLibro.masPresente(resumen)
    val nombrado = ResumenDelLibro.masNombrado(resumen)
    if (presente == null && nombrado == null) return
    val piezas = listOfNotNull(
        presente?.let { Triple("Más presente", it.nombre, "${it.apariciones} apariciones") },
        nombrado?.let { Triple("Más nombrado", it.nombre, "${it.nombramientos} menciones") },
    )
    val forma = RoundedCornerShape(Radios.lg)
    val contenido: @Composable (Triple<String, String, String>, Modifier) -> Unit = { (rotulo, nombre, cifra), m ->
        Column(m.heightIn(min = 74.dp).background(colores.superficieContenedor).padding(Espacios.e3), verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically)) {
            Text(rotulo.uppercase(), style = Textos.cuerpo.copy(fontSize = rem(0.67), fontWeight = FontWeight.Bold, color = colores.tintaSuave))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                Text(nombre, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.Bold, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                Text(cifra, style = Textos.cuerpo.copy(fontSize = rem(0.69), color = colores.primario))
            }
        }
    }
    val marco = Modifier.padding(start = if (ancha) 0.dp else Espacios.e4, end = if (ancha) 0.dp else Espacios.e4, top = Espacios.e4).fillMaxWidth().clip(forma).background(colores.contorno)
    if (ancha) {
        Row(marco.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(1.dp)) { piezas.forEach { contenido(it, Modifier.weight(1f).fillMaxHeight()) } }
    } else {
        Column(marco, verticalArrangement = Arrangement.spacedBy(1.dp)) { piezas.forEach { contenido(it, Modifier.fillMaxWidth()) } }
    }
}

/** `.m-book-stats__charts`: los cuatro gráficos, uno debajo de otro (dos columnas desde 900 dp). */
@Composable
private fun Graficos(libro: Libro, resumen: EstadisticasDelLibro, ancha: Boolean, muyAncha: Boolean) {
    val colores = LocalColores.current
    val ritmo = remember(resumen) { ResumenDelLibro.ritmo(resumen) }
    val presencia = remember(libro, resumen) { ResumenDelLibro.presencia(libro, resumen) }
    val reparto = remember(resumen) { ResumenDelLibro.reparto(resumen) }
    val grupos = remember(libro) { ResumenDelLibro.grupos(libro) }
    val tarjetas: List<@Composable (Modifier) -> Unit> = listOf(
        { m ->
            TarjetaDeGrafico("Ritmo del libro", "Páginas de cada capítulo", ancha, m) {
                if (ritmo == null) TextoVacio("Añade páginas a los capítulos para ver el ritmo.", Modifier.padding(horizontal = Espacios.e4, vertical = Espacios.e4))
                else Box(Modifier.padding(horizontal = Espacios.e2)) {
                    BarrasPorCapitulo(ritmo.first.map { it.first.toString() }, listOf(SerieDeBarras("Páginas", ritmo.first.map { it.second }, colores.primario)), 220.dp, media = ritmo.second, tituloX = "Capítulo")
                }
            }
        },
        { m ->
            TarjetaDeGrafico("Quién aparece", "Los personajes más presentes, capítulo a capítulo", ancha, m) {
                if (presencia == null) TextoVacio("Las escenas aún no tienen personajes registrados.", Modifier.padding(horizontal = Espacios.e4, vertical = Espacios.e4))
                else Box(Modifier.padding(horizontal = Espacios.e2)) { MapaDePresencia(presencia) }
            }
        },
        { m ->
            TarjetaDeGrafico("Reparto por capítulo", "Aparecen y solo nombrados", ancha, m) {
                if (reparto == null) TextoVacio("Las escenas aún no tienen personajes registrados.", Modifier.padding(horizontal = Espacios.e4, vertical = Espacios.e4))
                else Box(Modifier.padding(horizontal = Espacios.e2)) {
                    BarrasPorCapitulo(
                        reparto.map { it.first.toString() },
                        listOf(SerieDeBarras("Aparecen", reparto.map { it.second }, colores.primario), SerieDeBarras("Solo nombrados", reparto.map { it.third }, colores.atencion)),
                        220.dp,
                    )
                }
            }
        },
        { m ->
            TarjetaDeGrafico("Personajes por grupo", null, ancha, m) {
                if (grupos == null) TextoVacio("Todavía no hay personajes.", Modifier.padding(horizontal = Espacios.e4, vertical = Espacios.e4))
                else Box(Modifier.padding(horizontal = Espacios.e2)) { RoscoDeGrupos(grupos) }
            }
        },
    )
    Column(Modifier.fillMaxWidth().padding(top = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        if (muyAncha) {
            tarjetas.chunked(2).forEach { fila ->
                Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) { fila.forEach { it(Modifier.weight(1f).fillMaxHeight()) } }
            }
        } else {
            tarjetas.forEach { it(Modifier.fillMaxWidth()) }
        }
    }
}

/** `.m-book-stats__chart`: rayas arriba y abajo en el móvil; una tarjeta con borde desde 600 dp. */
@Composable
private fun TarjetaDeGrafico(titulo: String, subtitulo: String?, ancha: Boolean, modifier: Modifier, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.lg)
    Column(
        modifier
            .then(if (ancha) Modifier.clip(forma).border(1.dp, colores.contorno, forma) else Modifier.drawBehind {
                drawRect(colores.contorno, Offset.Zero, Size(size.width, 1.dp.toPx()))
                drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx()))
            })
            .background(colores.superficie)
            .padding(top = Espacios.e4, bottom = Espacios.e2),
    ) {
        Column(Modifier.padding(start = Espacios.e4, end = Espacios.e4, bottom = Espacios.e2)) {
            Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.06), color = colores.tinta))
            if (subtitulo != null) Text(subtitulo, style = Textos.cuerpo.copy(fontSize = rem(0.72), color = colores.tintaSuave), modifier = Modifier.padding(top = 3.dp))
        }
        contenido()
    }
}

@Composable
private fun TextoVacio(texto: String, modifier: Modifier = Modifier) {
    Text(texto, style = Textos.cuerpo.copy(fontSize = rem(0.78), lineHeight = 1.5.em, color = LocalColores.current.tintaSuave), modifier = modifier)
}

/** Sube la pieza [cuanto] y descuenta ese hueco del diseño (lo que hace un `margin-top` negativo en CSS; `offset` no lo descuenta). */
private fun Modifier.subir(cuanto: Dp) = layout { medible, restricciones ->
    val pieza = medible.measure(restricciones)
    val px = cuanto.roundToPx()
    layout(pieza.width, (pieza.height - px).coerceAtLeast(0)) { pieza.place(0, -px) }
}
