package es.yosiftware.libros.ui.biblioteca

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.ColumnaEstirada
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

/**
 * El editor de estado, puntuación y reseña (collection-state-modal, en su versión de la APK de Capacitor: siempre a
 * pantalla completa). Arriba, «Volver a la biblioteca», «Mi biblioteca» y el título; los seis estados; la reseña con
 * sus estrellas (sin puntuación no se escribe); «No compartir esta actualización en Comunidad»; abajo, Volver y Guardar.
 * Atrás vuelve, salvo mientras se guarda.
 */
@Composable
fun EditorDeEstado(
    titulo: String,
    valores: ValoresDeColeccion,
    guardando: Boolean,
    alElegirEstado: (TipoDeEstado) -> Unit,
    alPuntuar: (Int?) -> Unit,
    alEscribirResena: (String) -> Unit,
    alVolver: () -> Unit,
    alGuardar: () -> Unit,
    /** «No compartir esta actualización en Comunidad»: `null` no la enseña (`showActivityControl = false`, las secciones). */
    sinCompartir: Boolean? = null,
    alAlternarSinCompartir: () -> Unit = {},
    /** El `aria-label` de volver: «Volver a la biblioteca» o, en una sección, «Volver a las secciones». */
    etiquetaVolver: String = "Volver a la biblioteca",
    /** Sin estado elegido no se guarda (`requireStatus`); las secciones pueden guardar sin él. */
    exigeEstado: Boolean = true,
) {
    val puedeResenar = valores.puntuacion != null
    val colores = LocalColores.current
    val ventana = LocalVentana.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val volver = { if (!guardando) alVolver() }
    BackHandler(onBack = volver)
    val etiqueta = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.Bold, letterSpacing = 0.08.em, color = colores.tintaSuave)

    Column(Modifier.fillMaxSize().background(colores.lienzo).clickable(enabled = false) {}.imePadding()) {
        // La cabecera: volver | «Mi biblioteca» y el título, centrados | hueco del mismo ancho.
        Row(
            Modifier.fillMaxWidth().background(colores.superficie)
                .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                .padding(
                    start = Espacios.e3 + zona.calculateLeftPadding(direccion),
                    end = Espacios.e3 + zona.calculateRightPadding(direccion),
                    top = Espacios.e2 + zona.calculateTopPadding(),
                    bottom = Espacios.e2,
                )
                .heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier.size(48.dp).clip(CircleShape).border(1.dp, colores.contorno, CircleShape)
                    .clickable(enabled = !guardando, role = Role.Button, onClick = volver)
                    .semantics { contentDescription = etiquetaVolver },
                contentAlignment = Alignment.Center,
            ) {
                Icon(painterResource(Iconos.arrowBack), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            }
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("MI BIBLIOTECA", style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.1.em, color = colores.primario), modifier = Modifier.padding(bottom = 2.dp))
                Text(
                    titulo,
                    style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.2), fontWeight = FontWeight.SemiBold, lineHeight = 1.18.em, color = colores.tinta, textAlign = TextAlign.Center),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.size(48.dp))
        }

        // El cuerpo es una rejilla de CSS que llena la pantalla: el alto que sobra se reparte entre sus filas (y dentro de
        // cada una), así que los botones, el área de texto y la casilla crecen como en la APK de Capacitor.
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
            val relleno = Espacios.e5
            val minimo = maxHeight - relleno * 2
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                    .padding(horizontal = Espacios.e4 + zona.calculateLeftPadding(direccion), vertical = relleno),
            ) {
                ColumnaEstirada(Modifier.fillMaxWidth().heightIn(min = minimo), espacio = Espacios.e5) {
                    // Los estados: dos columnas (tres desde 600 dp).
                    ColumnaEstirada(Modifier.fillMaxWidth(), espacio = Espacios.e2) {
                        Box(Modifier.fillMaxWidth()) { Text("ESTADO", style = etiqueta) }
                        val columnas = if (ventana.anchoDp >= 600) 3 else 2
                        ColumnaEstirada(Modifier.fillMaxWidth(), espacio = Espacios.e2) {
                            TipoDeEstado.entries.chunked(columnas).forEach { fila ->
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                                    fila.forEach { estado ->
                                        val activo = valores.estado == estado
                                        val tinta = if (activo) colores.sobreContenedorPrimario else colores.tintaSuave
                                        Row(
                                            Modifier.weight(1f).fillMaxHeight().heightIn(min = 48.dp).clip(Radios.pildora)
                                                .background(if (activo) colores.contenedorPrimario else colores.superficie)
                                                .border(1.dp, if (activo) Color.Transparent else colores.contorno, Radios.pildora)
                                                .selectable(activo, role = Role.RadioButton) { alElegirEstado(estado) }
                                                .padding(horizontal = 13.dp),
                                            horizontalArrangement = Arrangement.spacedBy(7.dp, Alignment.CenterHorizontally),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(painterResource(iconoDeEstado(estado)), contentDescription = null, tint = tinta, modifier = Modifier.size(18.dp))
                                            Text(estado.nombre, style = Textos.cuerpo.copy(color = tinta), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        }
                                    }
                                    repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
                                }
                            }
                        }
                    }

                    // La reseña con sus estrellas.
                    ColumnaEstirada(Modifier.fillMaxWidth(), espacio = Espacios.e2) {
                        Row(Modifier.fillMaxWidth().heightIn(min = 30.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("RESEÑA", style = etiqueta, modifier = Modifier.weight(1f))
                            val puntuacion = valores.puntuacion
                            if (puntuacion != null) {
                                Box(
                                    Modifier.size(44.dp).clip(CircleShape).clickable { alPuntuar(null) }.semantics { contentDescription = "Quitar puntuación" },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(painterResource(Iconos.close), contentDescription = null, tint = colores.contornoFuerte, modifier = Modifier.size(18.dp))
                                }
                            }
                            (1..5).forEach { valor ->
                                val llena = puntuacion != null && valor <= puntuacion
                                Box(
                                    Modifier.size(44.dp).clip(CircleShape)
                                        .selectable(puntuacion == valor, role = Role.RadioButton) { alPuntuar(valor) }
                                        .semantics { contentDescription = "$valor de 5" },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Estrella(llena, colores.atencion, colores.contornoFuerte, Modifier.size(22.dp))
                                }
                            }
                        }
                        val habilitada = puedeResenar
                        val forma = RoundedCornerShape(Radios.sm)
                        BasicTextField(
                            value = valores.resena,
                            onValueChange = { if (it.length <= 1000) alEscribirResena(it) },
                            enabled = habilitada,
                            modifier = Modifier.fillMaxWidth().fillMaxHeight().heightIn(min = 132.dp)
                                .background(if (habilitada) colores.superficie else colores.superficieContenedor, forma)
                                .border(1.dp, colores.contornoFuerte, forma)
                                .padding(12.dp),
                            textStyle = Textos.cuerpo.copy(color = if (habilitada) colores.tinta else colores.tintaSuave),
                            cursorBrush = SolidColor(colores.primario),
                            decorationBox = { campo ->
                                Box {
                                    if (valores.resena.isEmpty()) {
                                        Text(if (habilitada) "Añade una reseña personal" else "Puntúa primero para escribir una reseña", style = Textos.cuerpo.copy(color = colores.tintaSuave))
                                    }
                                    campo()
                                }
                            },
                        )
                    }

                    // «No compartir esta actualización en Comunidad», centrada en su fila.
                    if (sinCompartir != null) Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
                        Row(
                            Modifier.heightIn(min = 44.dp).clickable(role = Role.Checkbox, onClick = alAlternarSinCompartir),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Casilla(sinCompartir)
                            Text("No compartir esta actualización en Comunidad", style = Textos.cuerpo.copy(fontSize = rem(0.86), color = colores.tintaSuave))
                        }
                    }
                }
            }
        }

        // El pie: Volver y Guardar, a la derecha.
        Row(
            Modifier.fillMaxWidth().background(colores.superficie)
                .drawBehind { drawRect(colores.contorno, Offset.Zero, Size(size.width, 1.dp.toPx())) }
                .padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e3, bottom = Espacios.e3 + zona.calculateBottomPadding()),
            horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End),
        ) {
            BotonDelEditor("Volver", primario = false, habilitado = !guardando, alPulsar = volver)
            BotonDelEditor("Guardar", primario = true, habilitado = !guardando && (!exigeEstado || valores.estado != null), alPulsar = alGuardar)
        }
    }
}

/** Los botones del pie: píldoras de 44 dp con 12 dp de relleno; Guardar sobre el primario, y apagados al guardar. */
@Composable
private fun BotonDelEditor(texto: String, primario: Boolean, habilitado: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val (fondo, tinta, borde) = when {
        !habilitado -> Triple(colores.superficieContenedor, mezclar(colores.tintaSuave, 0.55f), colores.contorno)
        primario -> Triple(colores.primario, colores.sobrePrimario, Color.Transparent)
        else -> Triple(Color.Transparent, colores.primario, colores.contorno)
    }
    Box(
        Modifier.heightIn(min = 44.dp).clip(Radios.pildora).background(fondo).border(1.dp, borde, Radios.pildora)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar)
            .padding(horizontal = 13.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, style = Textos.cuerpo.copy(color = tinta))
    }
}

/** La casilla de 20 dp (`accent-color` del primario): vacía con borde, o llena con la marca. */
@Composable
private fun Casilla(marcada: Boolean) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(3.dp)
    Box(
        Modifier.size(20.dp).clip(forma)
            .background(if (marcada) colores.primario else colores.superficie)
            .border(if (marcada) 0.dp else 1.5.dp, colores.contornoFuerte, forma),
        contentAlignment = Alignment.Center,
    ) {
        if (marcada) Icon(painterResource(Iconos.check), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(16.dp))
    }
}
