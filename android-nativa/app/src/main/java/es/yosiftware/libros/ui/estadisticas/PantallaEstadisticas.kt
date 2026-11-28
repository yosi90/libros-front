package es.yosiftware.libros.ui.estadisticas

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.CrecimientoDelCatalogo
import es.yosiftware.libros.datos.modelos.EstadisticasDeComunidad
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.Cargando
import es.yosiftware.libros.ui.componentes.Superficie
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

// Las Estadísticas de la APK: src/app/components/mobile/user/mobile-statistics-view/ y `app-stat-rows`, en su versión
// de la APK de Capacitor (5dc3120). Una columna en el móvil; desde 600 dp, una rejilla de dos.

/** Un bloque de la pantalla: a lo ancho o en una de las dos columnas (desde 600 dp). */
private class Bloque(val completo: Boolean, val contenido: @Composable () -> Unit)

private class Bloques {
    val lista = mutableListOf<Bloque>()
    fun completo(contenido: @Composable () -> Unit) { lista += Bloque(true, contenido) }
    fun mitad(contenido: @Composable () -> Unit) { lista += Bloque(false, contenido) }
}

@Composable
fun PantallaEstadisticas(vm: EstadisticasViewModel, alVerNuevos: (String) -> Unit = {}) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    Box(Modifier.fillMaxSize().background(colores.lienzo), contentAlignment = Alignment.TopCenter) {
        // Hasta la primera carga no se pinta nada, como la web (`@if (controller.chartsReady)`).
        if (!vm.listo) return@Box
        val bloques = Bloques().apply {
            // Sin antetítulo ni título: la navegación y las pestañas ya dicen dónde estás (el propietario, 2026-10-29).
            mitad { Pestanas(vm) }
            if (vm.pestana == PestanaDeEstadisticas.PERSONAL) personal(vm) else general(vm, alVerNuevos)
        }
        Column(
            Modifier.widthIn(max = 960.dp).fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(
                    start = if (ancha) Espacios.e6 else Espacios.e4,
                    end = if (ancha) Espacios.e6 else Espacios.e4,
                    top = if (ancha) Espacios.e6 else Espacios.e5,
                    bottom = if (ancha) Espacios.e6 else Espacios.e8,
                ),
            verticalArrangement = Arrangement.spacedBy(Espacios.e4),
        ) {
            if (!ancha) {
                bloques.lista.forEach { it.contenido() }
            } else {
                // La rejilla de dos columnas: lo completo ocupa la fila; lo demás va de dos en dos, a igual alto.
                var pendiente: Bloque? = null
                val cerrar: @Composable () -> Unit = {
                    pendiente?.let { solo ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                            Box(Modifier.weight(1f)) { solo.contenido() }
                            Spacer(Modifier.weight(1f))
                        }
                    }
                    pendiente = null
                }
                bloques.lista.forEach { bloque ->
                    when {
                        bloque.completo -> {
                            cerrar()
                            bloque.contenido()
                        }
                        pendiente == null -> pendiente = bloque
                        else -> {
                            val primero = pendiente!!
                            pendiente = null
                            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e4)) {
                                Box(Modifier.weight(1f).fillMaxHeight()) { primero.contenido() }
                                Box(Modifier.weight(1f).fillMaxHeight()) { bloque.contenido() }
                            }
                        }
                    }
                }
                cerrar()
            }
        }
    }
}

// --- Personal. ---

private fun Bloques.personal(vm: EstadisticasViewModel) {
    if (vm.noDisponible) {
        completo { NoDisponible("No se pudieron cargar tus estadísticas", "Comprueba tu conexión e inténtalo de nuevo.", vm::reintentar) }
        return
    }
    val datos = vm.personal ?: return
    if (vm.errorPersonal.isNotEmpty()) completo { AvisoDeError(vm.errorPersonal) }
    completo {
        Cifras(
            listOf(
                Cifra(datos.datos.librosLeidos?.toString() ?: "—", "Libros leídos"),
                Cifra(datos.datos.librosNoLeidos?.toString() ?: "—", "No leídos"),
                Cifra(datos.datos.antologiasLeidas?.toString() ?: "—", "Antologías"),
                Cifra(datos.datos.promedioDiasCompraLectura?.let { numero(it) } ?: "—", "Días compra-lectura"),
            ),
        )
    }
    mitad {
        Panel("Estados de lectura") {
            if (datos.estados.isEmpty()) {
                TextoDeApoyo("Sin datos suficientes.")
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) { datos.estados.forEach { BarraDeEstado(it) } }
            }
        }
    }
    mitad { Panel("Lecturas más rápidas") { FilasDeEstadistica(datos.rapidas, ordenadas = true) } }
    mitad { Panel("Más tiempo en espera") { FilasDeEstadistica(datos.enEspera, ordenadas = true) } }
    mitad { Panel("Autores que más lees") { FilasDeEstadistica(datos.autores) } }
    mitad { Panel("Estilos que más lees") { FilasDeEstadistica(datos.estilos) } }
    mitad { Panel("Tus puntuaciones") { FilasDeEstadistica(datos.puntuaciones) } }
    mitad {
        val porComprar = datos.datos.librosPorComprar
        Panel("Pendientes de comprar · ${porComprar.size}") {
            if (porComprar.isEmpty()) {
                TextoDeApoyo("Ninguno")
            } else {
                val colores = LocalColores.current
                Column(Modifier.padding(start = Espacios.e5), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    porComprar.forEach { libro ->
                        Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                            Text("•", style = Textos.cuerpo.copy(color = colores.tinta))
                            Text(libro.nombre, style = Textos.cuerpo.copy(color = colores.tinta))
                        }
                    }
                }
            }
        }
    }
    ritmoYPuntuaciones(datos)
}

/** Tu ritmo de lectura y tus puntuaciones en el tiempo (F2 y F3 de «Estadísticas y altas»); sin datos, nada. */
private fun Bloques.ritmoYPuntuaciones(datos: EstadisticasPersonales) {
    val ritmo = datos.datos.ritmoLectura
    if (ritmo != null) {
        completo {
            Cifras(
                listOf(
                    Cifra(ritmo.rachaActual.toString(), "Días seguidos"),
                    Cifra(ritmo.mejorRacha.toString(), "Mejor racha"),
                    Cifra(ritmo.diasConLectura.toString(), "Días con lectura"),
                    Cifra(numero(ritmo.paginasPorDiaActivo), "Págs./día leído"),
                ),
            )
        }
        mitad { Panel("Páginas por mes") { FilasDeEstadistica(datos.paginasPorMes) } }
        mitad { Panel("Qué días lees") { FilasDeEstadistica(datos.diasQueLees) } }
        mitad { Panel("A qué hora lees") { FilasDeEstadistica(datos.horasQueLees) } }
    }
    val valoraciones = datos.datos.valoraciones
    if (valoraciones != null) {
        completo {
            Cifras(
                listOf(
                    Cifra(valoraciones.notaMedia?.let { numero(it) } ?: "—", "Tu nota media"),
                    Cifra(datos.resenasDelAnio.toString(), "Reseñas en el año"),
                ),
            )
        }
        mitad { Panel("Puntuaciones por mes") { FilasDeEstadistica(datos.puntuacionesPorMes) } }
        mitad { Panel("Tu nota media por mes") { FilasDeEstadistica(datos.notaMediaPorMes) } }
    }
}

// --- General. ---

private fun Bloques.general(vm: EstadisticasViewModel, alVerNuevos: (String) -> Unit) {
    when {
        vm.cargandoGeneral -> completo { Cargando("Cargando las estadísticas generales") }
        vm.errorGeneral -> completo { NoDisponible("No se pudo cargar el catálogo", null, vm::cargarGeneral) }
        vm.generalCargado -> {
            if (vm.compartir != null) completo { Compartir(vm) }
            val comunidad = vm.comunidad
            if (vm.errorComunidad || comunidad == null) {
                completo { AvisoDeError("No se pudieron cargar los datos de la comunidad.", Iconos.info) }
            } else {
                comunidad(comunidad)
            }
            vm.catalogoEnCifras?.let { catalogo(it, vm.comunidad?.catalogo, alVerNuevos) }
        }
    }
}

private fun Bloques.comunidad(comunidad: EstadisticasDeComunidad) {
    completo {
        Cifras(
            listOf(
                Cifra(comunidad.lectoresActivos?.toString() ?: "—", "Lectores"),
                Cifra(comunidad.librosLeidos?.toString() ?: "—", "Libros leídos"),
                Cifra(comunidad.ritmoComunidad?.ritmoMedio?.let { numero(it) } ?: "—", "Págs./día"),
            ),
        )
    }
    val paginas = Estadisticas.paginasDeLaComunidad(comunidad.ritmoComunidad)
    if (paginas.isNotEmpty()) mitad { Panel("Páginas leídas por mes") { FilasDeEstadistica(paginas) } }
    val puntuaciones = Estadisticas.puntuacionesPorMes(comunidad.valoracionesComunidad)
    if (puntuaciones.isNotEmpty()) mitad { Panel("Puntuaciones por mes") { FilasDeEstadistica(puntuaciones) } }
    val notas = Estadisticas.notaMediaPorMes(comunidad.valoracionesComunidad)
    if (notas.isNotEmpty()) mitad { Panel("Nota media por mes") { FilasDeEstadistica(notas) } }
    val meses = Estadisticas.lecturasPorMes(comunidad)
    if (meses.isNotEmpty()) mitad { Panel("Lecturas por mes") { FilasDeEstadistica(meses) } }
    val rankings = Estadisticas.rankings(comunidad)
    rankings.forEach { (titulo, filas) -> mitad { Panel(titulo) { FilasDeEstadistica(filas, ordenadas = true) } } }
    if (rankings.isEmpty() && meses.isEmpty()) {
        mitad {
            Panel("Aún no hay datos suficientes", discontinuo = true, icono = Iconos.lockPerson) {}
        }
    }
    completo { Actividad(comunidad.actividad30Dias) }
    mitad { Panel("Clubes más amplios") { FilasDeEstadistica(Estadisticas.filasDeClubes(comunidad.clubesMasAmplios), ordenadas = true) } }
    mitad { Panel("Clubes más activos") { FilasDeEstadistica(Estadisticas.filasDeClubes(comunidad.clubesMasActivos, porActividad = true), ordenadas = true) } }
}

private fun Bloques.catalogo(catalogo: ResumenDelCatalogo, crecimiento: CrecimientoDelCatalogo?, alVerNuevos: (String) -> Unit) {
    completo {
        Cifras(
            listOf(
                Cifra(catalogo.titulos.toString(), "Títulos"),
                Cifra(catalogo.autores.toString(), "Autores"),
                Cifra(catalogo.estilos.size.toString(), "Estilos"),
                Cifra(catalogo.idiomas.size.toString(), "Idiomas"),
            ),
        )
    }
    // Las obras nuevas (F1): cada cifra abre el catálogo con su filtro «Nuevos».
    if (crecimiento != null) {
        completo {
            Cifras(
                listOf(
                    Cifra(crecimiento.nuevas24h.toString(), "Nuevos en 24 horas") { alVerNuevos("24h") },
                    Cifra(crecimiento.nuevas7d.toString(), "Nuevos esta semana") { alVerNuevos("7d") },
                    Cifra(crecimiento.nuevas30d.toString(), "Nuevos este mes") { alVerNuevos("30d") },
                ),
            )
        }
    }
    mitad { Panel("Obras añadidas por mes") { FilasDeEstadistica(Estadisticas.altasPorMes(crecimiento)) } }
    mitad { Panel("Títulos por estilo") { FilasDeEstadistica(catalogo.estilos) } }
    mitad { Panel("Autores con más títulos") { FilasDeEstadistica(catalogo.autoresConMasTitulos, ordenadas = true) } }
    mitad { Panel("Idiomas disponibles") { FilasDeEstadistica(catalogo.idiomas) } }
    mitad { Panel("Publicación por décadas") { FilasDeEstadistica(catalogo.decadas) } }
}

// --- Piezas. ---

/** `.m-stats__tabs`: Personal y General, con la palabra, en una píldora sobre el contenedor de la superficie. */
@Composable
private fun Pestanas(vm: EstadisticasViewModel) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().clip(Radios.pildora).background(colores.superficieContenedor).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        listOf(PestanaDeEstadisticas.PERSONAL to "Personal", PestanaDeEstadisticas.GENERAL to "General")
            .forEach { (pestana, nombre) ->
                val activa = vm.pestana == pestana
                val tinta = if (activa) colores.sobrePrimario else colores.tintaSuave
                Box(
                    Modifier.weight(1f).heightIn(min = 44.dp).clip(Radios.pildora)
                        .background(if (activa) colores.primario else Color.Transparent)
                        .selectable(selected = activa, role = Role.Tab) { vm.elegir(pestana) },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(nombre, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = tinta))
                }
            }
    }
}

/** Una cifra: el valor y su nombre, sin icono (ronda 1 de interfaz, S1). */
private class Cifra(val valor: String, val nombre: String, val alPulsar: (() -> Unit)? = null)

/** `.m-stats__metrics`: dos columnas en el móvil y cuatro desde 600 dp. */
@Composable
private fun Cifras(cifras: List<Cifra>) {
    val columnas = if (LocalVentana.current.anchoDp >= 600) 4 else 2
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        cifras.chunked(columnas).forEach { fila ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                fila.forEach { TarjetaDeCifra(it, Modifier.weight(1f).fillMaxHeight()) }
                repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun TarjetaDeCifra(cifra: Cifra, modifier: Modifier) {
    val colores = LocalColores.current
    // Las de «Nuevos» llevan al catálogo con ese filtro (`.m-stats__metric-link`).
    val pulsable = cifra.alPulsar?.let { accion -> Modifier.clip(RoundedCornerShape(Radios.lg)).clickable(role = Role.Button, onClick = accion) } ?: Modifier
    Tarjeta(modifier.then(pulsable)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            // El interlineado, medido en la captura: el `strong` de la rejilla deja más aire que el de la letra.
            Text(cifra.valor, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.7), fontWeight = FontWeight.Bold, lineHeight = 1.85.em, color = colores.tinta))
            Text(cifra.nombre, style = Textos.nota.copy(color = colores.tintaSuave))
        }
    }
}

/**
 * `.m-stats__panel`: una tarjeta con su título de display y lo suyo debajo. Sin icono (ronda 1 de interfaz, S1), salvo
 * el candado del umbral de privacidad ([icono]).
 */
@Composable
private fun Panel(titulo: String, discontinuo: Boolean = false, @DrawableRes icono: Int? = null, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    val cuerpo: @Composable ColumnScope.() -> Unit = {
        Row(Modifier.padding(bottom = Espacios.e4), horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
            if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            Text(titulo, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.15), lineHeight = 1.25.em, color = colores.tinta))
        }
        contenido()
    }
    if (!discontinuo) {
        Tarjeta(Modifier.fillMaxSize(), contenido = cuerpo)
    } else {
        // `.m-stats__soon`: el borde de la tarjeta, discontinuo.
        val forma = RoundedCornerShape(Radios.md)
        Column(
            Modifier.fillMaxSize().clip(forma).background(colores.superficie)
                .drawBehind {
                    drawRoundRect(
                        colores.contorno, cornerRadius = CornerRadius(Radios.md.toPx()),
                        style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))),
                    )
                }
                .padding(Espacios.e4 + 1.dp),
            content = cuerpo,
        )
    }
}

/** `app-stat-rows`: una barra por fila, con su puesto si es un ranking. */
@Composable
internal fun FilasDeEstadistica(filas: List<FilaDeEstadistica>, ordenadas: Boolean = false, vacio: String = "Sin datos suficientes.") {
    val colores = LocalColores.current
    if (filas.isEmpty()) {
        Text(vacio, style = Textos.cuerpo.copy(color = colores.tintaSuave))
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        filas.forEachIndexed { i, fila ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                if (ordenadas) {
                    Box(Modifier.size(24.dp).clip(CircleShape).background(colores.superficieContenedor), contentAlignment = Alignment.Center) {
                        Text("${i + 1}", style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.Bold, color = colores.tinta))
                    }
                }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        val letra = Textos.cuerpo.copy(fontSize = rem(0.875))
                        Text(fila.etiqueta, style = letra.copy(color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        Text(fila.texto, style = letra.copy(fontWeight = FontWeight.Bold, color = colores.tintaSuave))
                    }
                    Pista(Estadisticas.porcentaje(fila, filas), colores.contorno)
                }
            }
        }
    }
}

/** Una de las barras de «Estados de lectura» (`.m-stats__bars`): sin el mínimo del 4 %. */
@Composable
private fun BarraDeEstado(fila: FilaDeEstado) {
    val colores = LocalColores.current
    Column {
        Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            val letra = Textos.cuerpo.copy(fontSize = rem(0.76), color = colores.tinta)
            Text(fila.etiqueta, style = letra, modifier = Modifier.weight(1f))
            Text("${fila.valor} · ${fila.porcentaje}%", style = letra.copy(fontWeight = FontWeight.Bold))
        }
        Pista(fila.porcentaje, colores.superficieAlta)
    }
}

/** Una pista de 8 dp con la parte llena en el primario. */
@Composable
private fun Pista(porcentaje: Int, fondo: Color) {
    val colores = LocalColores.current
    Box(Modifier.fillMaxWidth().height(8.dp).clip(Radios.pildora).background(fondo)) {
        Box(Modifier.fillMaxWidth(porcentaje.coerceIn(0, 100) / 100f).fillMaxHeight().clip(Radios.pildora).background(colores.primario))
    }
}

/** `.m-stats__activity`: la actividad de 30 días, en tantas columnas de 100 dp como quepan; sin icono. */
@Composable
private fun Actividad(actividad: Map<String, Int?>) {
    val colores = LocalColores.current
    val piezas = listOf(
        "Publicaciones" to "Publicaciones",
        "Comentarios" to "Comentarios",
        "Reacciones" to "Reacciones",
        "Debates" to "Debates",
        "VotosEncuesta" to "Votos",
        "Eventos" to "Eventos",
        "NuevosMiembros" to "Nuevos miembros",
    )
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val hueco: Dp = Espacios.e2
        val columnas = maxOf(1, ((maxWidth + hueco) / (100.dp + hueco)).toInt())
        Column(verticalArrangement = Arrangement.spacedBy(hueco)) {
            piezas.chunked(columnas).forEach { fila ->
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(hueco)) {
                    fila.forEach { (clave, nombre) ->
                        Superficie(Modifier.weight(1f).fillMaxHeight()) {
                            Column(Modifier.padding(Espacios.e3 + 1.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(actividad[clave]?.toString() ?: "—", style = Textos.cuerpo.copy(fontSize = rem(1.2), fontWeight = FontWeight.Bold, color = colores.tinta))
                                Text(nombre, style = Textos.cuerpo.copy(fontSize = rem(0.75), lineHeight = 1.3.em, color = colores.tintaSuave))
                            }
                        }
                    }
                    repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

/** `.m-stats__error`: un aviso en los colores de error. */
@Composable
private fun AvisoDeError(texto: String, @DrawableRes icono: Int = Iconos.errorOutline) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.contenedorError).padding(Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.error, modifier = Modifier.size(24.dp))
        Text(texto, style = Textos.cuerpo.copy(color = colores.error))
    }
}

/** `.m-stats__unavailable`: no se pudo cargar, con «Reintentar». */
@Composable
private fun NoDisponible(titulo: String, texto: String?, alReintentar: () -> Unit) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(
            Modifier.fillMaxWidth().padding(vertical = Espacios.e6 - Espacios.e4),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            Icon(painterResource(Iconos.cloudOff), contentDescription = null, tint = colores.primario, modifier = Modifier.size(40.dp))
            Text(titulo, style = Textos.cuerpo.copy(fontSize = rem(1.5), lineHeight = 1.25.em, color = colores.tinta, textAlign = TextAlign.Center))
            if (texto != null) Text(texto, style = Textos.cuerpo.copy(color = colores.tinta, textAlign = TextAlign.Center))
            Boton("Reintentar", alReintentar, icono = Iconos.refresh)
        }
    }
}

/** «Compartir mis lecturas» (`.m-stats__consent`, F1 de «Estadísticas y altas»): una línea con su interruptor. */
@Composable
private fun Compartir(vm: EstadisticasViewModel) {
    val colores = LocalColores.current
    val comparto = vm.compartir == true
    Tarjeta(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().toggleable(value = comparto, enabled = !vm.guardandoCompartir, role = Role.Switch) { vm.alternarCompartir() },
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Compartir mis lecturas, de forma anónima", style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta))
                if (vm.errorCompartir.isNotEmpty()) Text(vm.errorCompartir, style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error))
            }
            Switch(checked = comparto, onCheckedChange = null, enabled = !vm.guardandoCompartir)
        }
    }
}
