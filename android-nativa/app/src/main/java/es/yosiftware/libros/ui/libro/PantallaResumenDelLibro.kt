package es.yosiftware.libros.ui.libro

import android.app.DatePickerDialog
import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
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
// su versión de la APK de Capacitor (5dc3120). «Tu lectura» (el medidor o la página, y las fechas), las cifras, los
// personajes destacados y los cuatro gráficos.

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

/** `.m-book-stats__summary`: el degradado del contenedor primario, el medidor o la página, y las fechas. */
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
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            if (progreso.porcentaje != null) {
                Medidor(progreso.porcentaje, Modifier.offset(y = (-12).dp))
                Text(
                    buildAnnotatedString {
                        append("Página ")
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = colores.tinta)) { append(progreso.pagina.toString()) }
                        append(" de ${progreso.total}")
                    },
                    style = Textos.cuerpo.copy(fontSize = rem(0.82), color = colores.tintaSuave),
                    modifier = Modifier.subir(20.dp).padding(bottom = Espacios.e3),
                )
            } else {
                Column(Modifier.padding(bottom = Espacios.e2), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Vas por la página", style = Textos.cuerpo.copy(fontSize = rem(0.8), color = colores.tintaSuave))
                    Text(progreso.pagina.takeIf { it > 0 }?.toString() ?: "—", style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(2.6), fontWeight = FontWeight.Bold, lineHeight = 1.em, color = colores.tinta))
                }
                TextoVacio("El libro no tiene registrado su total de páginas.", Modifier.padding(vertical = Espacios.e4))
            }
        }
        Column {
            HitoDeLectura("Comprado", ultimo = false) {
                val comprado = ResumenDelLibro.comprado(libro)
                if (comprado != null) ValorDeHito(ResumenDelLibro.fechaCorta(comprado) ?: comprado) else FechaDeCompra(vm)
            }
            HitoDeLectura("Comenzado", ultimo = false) {
                ValorDeHito(ResumenDelLibro.comenzado(libro)?.let { ResumenDelLibro.fechaCorta(it) ?: it } ?: ResumenDelLibro.etiquetaDeComenzado(libro))
            }
            HitoDeLectura("Leído", ultimo = true) {
                ValorDeHito(ResumenDelLibro.leido(libro)?.let { ResumenDelLibro.fechaCorta(it) ?: it } ?: ResumenDelLibro.etiquetaDeLeido(libro))
            }
        }
    }
}

/** Una fila de `.m-book-stats__timeline`: el círculo, el nombre y la raya hacia la siguiente; el valor a la derecha. */
@Composable
private fun HitoDeLectura(nombre: String, ultimo: Boolean, valor: @Composable () -> Unit) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth().heightIn(min = 58.dp), horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
        Row(
            Modifier.widthIn(min = 104.dp).drawBehind {
                if (!ultimo) {
                    // La raya de 2 dp que baja hasta el círculo siguiente (`dt::after`).
                    val x = 5.dp.toPx()
                    drawRect(colores.contornoFuerte, Offset(x, size.height / 2 + 12.dp.toPx()), Size(2.dp.toPx(), 34.dp.toPx()))
                }
            },
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(12.dp).clip(CircleShape).background(colores.superficie).border(3.dp, colores.primario, CircleShape))
            Text(nombre, style = Textos.cuerpo.copy(fontSize = rem(0.76), fontWeight = FontWeight.Bold, color = colores.tintaSuave))
        }
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) { valor() }
    }
}

@Composable
private fun ValorDeHito(texto: String) {
    Text(texto, style = Textos.cuerpo.copy(fontSize = rem(0.82), color = LocalColores.current.tinta, textAlign = TextAlign.End))
}

/** «Establecer fecha» con su campo de fecha (`input type="date"`), que abre el calendario de Android. */
@Composable
private fun FechaDeCompra(vm: LibroViewModel) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        Text("Establecer fecha", style = Textos.cuerpo.copy(fontSize = rem(0.7), fontWeight = FontWeight.Bold, color = colores.primario))
        Row(
            Modifier.width(145.dp).heightIn(min = 44.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contornoFuerte, forma)
                .clickable(enabled = !vm.guardandoCompra) {
                    val hoy = LocalDate.now()
                    DatePickerDialog(contexto, { _, anio, mes, dia -> vm.ponerFechaDeCompra(LocalDate.of(anio, mes + 1, dia)) }, hoy.year, hoy.monthValue - 1, hoy.dayOfMonth).show()
                }
                .padding(horizontal = Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("dd/mm/aaaa", style = Textos.cuerpo.copy(fontSize = rem(0.82), color = colores.tinta), modifier = Modifier.weight(1f))
            Icon(painterResource(Iconos.calendarToday), contentDescription = "Elegir la fecha de compra", tint = colores.tinta, modifier = Modifier.size(18.dp))
        }
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
