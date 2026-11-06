package es.yosiftware.libros.ui.libro

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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.datos.modelos.EstadisticasDelLibro
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.RitmoDelLibro
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import java.time.LocalDate

// El resumen del libro, la primera pantalla al abrirlo. Desde el 6/11/2026, «Tu lectura» es un panel denso (opción B del
// propietario, con las fechas de la C): casillas en dos columnas, cada una con su dato y un gráfico mini, sin repetir
// cifras: el progreso, el ritmo, los capítulos, los últimos días, las fechas, el reparto y quién aparece. Lo que no cabe
// (el reparto por capítulo y los personajes por grupo) queda tras «Ver gráficos».

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
                .padding(start = if (ancha) Espacios.e6 else Espacios.e3, end = if (ancha) Espacios.e6 else Espacios.e3, top = if (ancha) Espacios.e5 else Espacios.e3, bottom = Espacios.e8),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Tu título divertido (IA2), solo de los libros: la portada viva, arriba del todo.
            if (!libro.obra.esAntologia) TituloDelLibro(libro.obra.id, SitioDelTitulo.CABECERA)
            Panel(vm, libro, resumen)
            MasGraficos(libro, resumen, ancha, muyAncha)
        }
    }
}

/** Las casillas del panel, en dos columnas: las de dato corto van de dos en dos y las anchas, a lo ancho. */
@Composable
private fun Panel(vm: LibroViewModel, libro: Libro, resumen: EstadisticasDelLibro) {
    val hoy = remember { LocalDate.now() }
    val terminado = ResumenDelLibro.leido(libro) != null
    val progreso = ResumenDelLibro.progreso(libro, resumen, terminado)
    val ritmo = libro.metricas?.ritmo
    val comenzado = PanelDeLectura.diaDe(ResumenDelLibro.comenzado(libro))
    val leido = PanelDeLectura.diaDe(ResumenDelLibro.leido(libro))
    val fin = PanelDeLectura.finEstimado(progreso, ritmo, hoy, terminado)
    CasillaDeProgreso(progreso, comenzado, leido, fin, ResumenDelLibro.estadoSinFecha(libro), hoy)
    Pareja(
        ritmo?.let { r -> @Composable { m: Modifier -> CasillaDeRitmo(r, m) } },
        resumen.capitulos.takeIf { it.isNotEmpty() }?.let { @Composable { m: Modifier -> CasillaDeCapitulos(resumen, m) } },
    )
    val dias = remember(ritmo) { ritmo?.let { PanelDeLectura.ultimosDias(it) }.orEmpty() }
    val hitos = PanelDeLectura.hitos(libro, sinRepetir = setOfNotNull("Comenzado".takeIf { comenzado != null }, "Leído".takeIf { leido != null }))
    val sinCompra = ResumenDelLibro.comprado(libro) == null
    Pareja(
        dias.takeIf { it.isNotEmpty() }?.let { @Composable { m: Modifier -> CasillaDeDias(dias, m) } },
        if (hitos.isNotEmpty() || sinCompra) @Composable { m: Modifier -> CasillaDeFechas(vm, hitos, sinCompra, hoy, m) } else null,
    )
    CasillaDeReparto(resumen)
    val presencia = remember(libro, resumen) { ResumenDelLibro.presencia(libro, resumen) }
    if (presencia != null) {
        Casilla(Modifier.fillMaxWidth()) {
            Rotulo("Quién aparece, capítulo a capítulo")
            MapaDePresencia(presencia)
        }
    }
}

/** Dos casillas en una fila, a la misma altura; si solo hay una, a lo ancho. */
@Composable
private fun Pareja(primera: (@Composable (Modifier) -> Unit)?, segunda: (@Composable (Modifier) -> Unit)?) {
    when {
        primera != null && segunda != null -> Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            primera(Modifier.weight(1f).fillMaxHeight())
            segunda(Modifier.weight(1f).fillMaxHeight())
        }
        primera != null -> primera(Modifier.fillMaxWidth())
        segunda != null -> segunda(Modifier.fillMaxWidth())
    }
}

/** Una casilla del panel: la superficie con su borde y un radio de 18 dp. */
@Composable
private fun Casilla(modifier: Modifier, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    Column(
        modifier.clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma).padding(horizontal = 14.dp, vertical = Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        content = contenido,
    )
}

/** La etiqueta de una casilla: 12 sp, seminegrita, en la tinta suave; con algo a la derecha si se da. */
@Composable
private fun Rotulo(texto: String, derecha: String? = null) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(texto, style = Textos.cuerpo.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.2.em, color = colores.tintaSuave), modifier = Modifier.weight(1f))
        if (derecha != null) Text(derecha, style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.2.em, color = colores.tintaSuave))
    }
}

/** La cifra grande de una casilla (22 sp, 800) y su unidad detrás. */
@Composable
private fun Cifra(valor: String, unidad: String) {
    val colores = LocalColores.current
    Text(
        buildAnnotatedString {
            append(valor)
            withStyle(SpanStyle(fontSize = 13.sp, fontWeight = FontWeight.Medium, color = colores.tintaSuave)) { append(" $unidad") }
        },
        style = Textos.cuerpo.copy(fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 1.15.em, color = colores.tinta),
        maxLines = 1, overflow = TextOverflow.Ellipsis,
    )
}

/** El progreso: la página frente al total y el %, su barra, cuándo empezó y cuándo acabaría al ritmo actual (o acabó). */
@Composable
private fun CasillaDeProgreso(progreso: Progreso, comenzado: LocalDate?, leido: LocalDate?, fin: LocalDate?, estado: String, hoy: LocalDate) {
    val colores = LocalColores.current
    val izquierda = comenzado?.let { "Comenzado ${PanelDeLectura.fecha(it, hoy)}" } ?: estado.takeIf { it.isNotEmpty() }
    val derecha = leido?.let { "Leído ${PanelDeLectura.fecha(it, hoy)}" } ?: fin?.let { "Al ritmo actual, ${PanelDeLectura.fecha(it, hoy)}" }
    if (progreso.pagina <= 0 && izquierda == null && derecha == null) return
    Casilla(Modifier.fillMaxWidth()) {
        if (progreso.pagina > 0 || progreso.total != null) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Text(progreso.pagina.toString(), style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = 24.sp, fontWeight = FontWeight.Bold, lineHeight = 1.1.em, color = colores.tinta))
                Text(progreso.total?.let { "de $it págs." } ?: "págs.", style = Textos.cuerpo.copy(fontSize = 14.sp, lineHeight = 1.6.em, color = colores.tintaSuave), modifier = Modifier.weight(1f))
                progreso.porcentaje?.let { Text("$it %", style = Textos.cuerpo.copy(fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 1.5.em, color = colores.primario)) }
            }
            progreso.porcentaje?.let { porcentaje ->
                Box(Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(50)).background(colores.superficieContenedor)) {
                    Box(Modifier.fillMaxWidth(porcentaje.coerceIn(0, 100) / 100f).fillMaxHeight().clip(RoundedCornerShape(50)).background(colores.primario))
                }
            }
        }
        if (izquierda != null || derecha != null) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Text(izquierda.orEmpty(), style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.3.em, color = colores.tintaSuave), modifier = Modifier.weight(1f))
                if (derecha != null) Text(derecha, style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.3.em, color = colores.tintaSuave, textAlign = TextAlign.End))
            }
        }
    }
}

/** El ritmo: páginas por día con lectura, su línea día a día y frente a tu media. */
@Composable
private fun CasillaDeRitmo(ritmo: RitmoDelLibro, modifier: Modifier) {
    val colores = LocalColores.current
    val valores = remember(ritmo) { PanelDeLectura.paginasPorDia(ritmo).takeLast(14).map { it.second } }
    val frente = PanelDeLectura.frenteATuMedia(ritmo)
    Casilla(modifier) {
        Rotulo("Ritmo")
        Cifra(ResumenDelLibro.hastaUnDecimal(ritmo.paginasPorDia), "págs./día")
        LineaMini(valores, 44.dp)
        if (frente != null) Text(frente, style = Textos.cuerpo.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.3.em, color = if (frente.startsWith("+")) colores.exito else colores.tintaSuave))
    }
}

/** Los capítulos y las escenas, las barras de las páginas de cada capítulo y su media. */
@Composable
private fun CasillaDeCapitulos(resumen: EstadisticasDelLibro, modifier: Modifier) {
    val colores = LocalColores.current
    val paginas = remember(resumen) { PanelDeLectura.paginasPorCapitulo(resumen) }
    val media = ResumenDelLibro.paginasPorCapitulo(resumen)
    val escenas = ResumenDelLibro.escenas(resumen)
    Casilla(modifier) {
        Rotulo("Capítulos")
        Cifra(resumen.capitulos.size.toString(), "· $escenas ${if (escenas == 1) "escena" else "escenas"}")
        if (paginas.isNotEmpty()) BarrasMini(paginas, 44.dp)
        if (media != null) Text("${ResumenDelLibro.hastaUnDecimal(media)} págs. de media", style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.3.em, color = colores.tintaSuave))
    }
}

/** Los últimos días hasta el último con lectura: una barra por día con sus páginas; el mejor, destacado. */
@Composable
private fun CasillaDeDias(dias: List<DiaDeLectura>, modifier: Modifier) {
    val colores = LocalColores.current
    val mejor = PanelDeLectura.mejor(dias)
    val tope = dias.maxOf { it.paginas ?: 0 }.coerceAtLeast(1)
    Casilla(modifier) {
        Rotulo("Últimos días")
        dias.forEach { dia ->
            val destacado = dia.fecha == mejor
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(PanelDeLectura.diaCorto(dia.fecha), style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.3.em, color = colores.tintaSuave), modifier = Modifier.width(44.dp), maxLines = 1)
                Box(Modifier.weight(1f).height(12.dp)) {
                    val paginas = dia.paginas ?: 0
                    val fraccion = if (paginas > 0) paginas.toFloat() / tope else 0f
                    Box(
                        Modifier.then(if (paginas > 0) Modifier.fillMaxWidth(fraccion) else Modifier.width(6.dp)).fillMaxHeight().clip(RoundedCornerShape(50))
                            .background(when {
                                paginas <= 0 -> colores.contorno
                                destacado -> colores.primario
                                else -> mezclar(colores.primario, 0.42f, colores.superficie)
                            }),
                    )
                }
                Text(
                    dia.paginas?.takeIf { it > 0 }?.toString() ?: "—",
                    style = Textos.cuerpo.copy(fontSize = 12.5.sp, lineHeight = 1.3.em, fontWeight = if (destacado) FontWeight.Bold else FontWeight.Normal, color = if (dia.paginas != null && dia.paginas > 0) colores.tinta else colores.tintaSuave, textAlign = TextAlign.End),
                    modifier = Modifier.width(26.dp), maxLines = 1,
                )
            }
        }
    }
}

/** Las fechas de la lectura que no salen ya en el progreso, de la más reciente a la más antigua; y añadir la de compra. */
@Composable
private fun CasillaDeFechas(vm: LibroViewModel, hitos: List<HitoConFecha>, sinCompra: Boolean, hoy: LocalDate, modifier: Modifier) {
    val colores = LocalColores.current
    Casilla(modifier) {
        Rotulo("Fechas")
        hitos.forEachIndexed { i, hito ->
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(10.dp).clip(CircleShape).background(colores.superficie)
                        .border(2.dp, if (i == 0) colores.primario else colores.contornoFuerte, CircleShape),
                )
                Column(Modifier.weight(1f)) {
                    Text(
                        if (hito.detalle.isEmpty()) hito.nombre else "${hito.nombre} · ${hito.detalle}",
                        style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.3.em, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                    Text(PanelDeLectura.fecha(hito.fecha, hoy), style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.3.em, color = colores.tintaSuave))
                }
            }
        }
        if (sinCompra) FechaDeCompra(vm)
    }
}

/** «Añadir fecha de compra»: abre el calendario de Android (en la web, un `input type="date"`). */
@Composable
private fun FechaDeCompra(vm: LibroViewModel) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    Row(
        Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(Radios.sm))
            .clickable(enabled = !vm.guardandoCompra, role = Role.Button) {
                val hoy = LocalDate.now()
                DatePickerDialog(contexto, { _, anio, mes, dia -> vm.ponerFechaDeCompra(LocalDate.of(anio, mes + 1, dia)) }, hoy.year, hoy.monthValue - 1, hoy.dayOfMonth).show()
            },
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.calendarToday), contentDescription = null, tint = colores.primario, modifier = Modifier.size(16.dp))
        Text("Fecha de compra", style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold, lineHeight = 1.2.em, color = colores.primario))
    }
}

/** El reparto: los principales con su barra de apariciones y de solo nombrado, y el total de personajes. */
@Composable
private fun CasillaDeReparto(resumen: EstadisticasDelLibro) {
    val colores = LocalColores.current
    val principales = remember(resumen) { PanelDeLectura.principales(resumen) }
    if (principales.isEmpty()) return
    val tope = principales.maxOf { it.total }.coerceAtLeast(1)
    val nombrado = mezclar(colores.atencion, 0.7f, colores.superficie)
    Casilla(Modifier.fillMaxWidth()) {
        Rotulo("Reparto", "${resumen.personajes.size} personajes")
        principales.forEach { personaje ->
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                Text(personaje.nombre, style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, lineHeight = 1.3.em, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.width(92.dp))
                Row(Modifier.weight(1f).height(10.dp).clip(RoundedCornerShape(50)).background(colores.superficieContenedor)) {
                    if (personaje.apariciones > 0) Box(Modifier.weight(personaje.apariciones.toFloat()).fillMaxHeight().background(colores.primario))
                    if (personaje.nombramientos > 0) Box(Modifier.weight(personaje.nombramientos.toFloat()).fillMaxHeight().background(nombrado))
                    if (personaje.total < tope) Box(Modifier.weight((tope - personaje.total).toFloat()).fillMaxHeight())
                }
                Text(personaje.total.toString(), style = Textos.cuerpo.copy(fontSize = 13.sp, lineHeight = 1.3.em, color = colores.tintaSuave, textAlign = TextAlign.End), modifier = Modifier.width(28.dp))
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            listOf("Aparece" to colores.primario, "Nombrado" to nombrado).forEach { (nombre, color) ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(10.dp).clip(RoundedCornerShape(3.dp)).background(color))
                    Text(nombre, style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.2.em, color = colores.tintaSuave))
                }
            }
        }
    }
}

/** «Ver gráficos»: lo que no cabe en el panel (el reparto por capítulo y los personajes por grupo), plegado. */
@Composable
private fun MasGraficos(libro: Libro, resumen: EstadisticasDelLibro, ancha: Boolean, muyAncha: Boolean) {
    val colores = LocalColores.current
    val reparto = remember(resumen) { ResumenDelLibro.reparto(resumen) }
    val grupos = remember(libro) { ResumenDelLibro.grupos(libro) }
    if (reparto == null && grupos == null) return
    var abiertos by rememberSaveable(libro.id) { mutableStateOf(false) }
    Row(
        Modifier.heightIn(min = 44.dp).clip(Radios.pildora).border(1.dp, colores.contorno, Radios.pildora)
            .clickable(role = Role.Button) { abiertos = !abiertos }.padding(horizontal = Espacios.e4),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(if (abiertos) "Ocultar gráficos" else "Ver gráficos", style = Textos.cuerpo.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold, lineHeight = 1.2.em, color = colores.primario))
        Icon(painterResource(if (abiertos) Iconos.expandLess else Iconos.expandMore), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
    }
    if (!abiertos) return
    val tarjetas: List<@Composable (Modifier) -> Unit> = listOfNotNull(
        reparto?.let { datos ->
            @Composable { m: Modifier ->
                Casilla(m) {
                    Rotulo("Reparto por capítulo")
                    BarrasPorCapitulo(
                        datos.map { it.first.toString() },
                        listOf(SerieDeBarras("Aparecen", datos.map { it.second }, colores.primario), SerieDeBarras("Solo nombrados", datos.map { it.third }, colores.atencion)),
                        220.dp,
                    )
                }
            }
        },
        grupos?.let { datos -> @Composable { m: Modifier -> Casilla(m) { Rotulo("Personajes por grupo"); RoscoDeGrupos(datos) } } },
    )
    if (muyAncha || ancha) {
        Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) { tarjetas.forEach { it(Modifier.weight(1f).fillMaxHeight()) } }
    } else {
        tarjetas.forEach { it(Modifier.fillMaxWidth()) }
    }
}
