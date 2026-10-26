package es.yosiftware.libros.ui.avisos

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import es.yosiftware.libros.datos.leerFecha
import es.yosiftware.libros.datos.modelos.AvisoDelCentro
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
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
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

// El panel de la campana: el aspecto de mobile-notification-center-view de la APK de Capacitor (5dc3120) con el
// contenido del centro de la plataforma (`NOTIFICACIONES.md`, «Tu propio centro»). Lo propio de aquel centro de Libros
// («Marcar y limpiar», descartar deslizando, «Todo al día») no se clona: el kit no deja borrar en la app lo que es de la
// plataforma.

/** Lo que el panel necesita de fuera: abrir el destino de un enlace, la web social y completar las imágenes. */
class AccionesDelPanel(
    /** El destino de un enlace de [AvisoDelCentro] (el suyo o el de uno de sus botones). */
    val abrirEnlace: (AvisoDelCentro, String) -> Unit,
    val verTodas: () -> Unit,
    val preferencias: () -> Unit,
    /** Una ruta de imagen de la API de la plataforma, completa. */
    val imagen: (String?) -> String?,
)

private val HORA = DateTimeFormatter.ofPattern("HH:mm")
private val DIA_Y_HORA = DateTimeFormatter.ofPattern("dd/MM HH:mm")

/** La hora de hoy, o el día y la hora. */
internal fun cuando(iso: String, zona: ZoneId = ZoneId.systemDefault(), hoy: LocalDate = LocalDate.now(zona)): String {
    val fecha = leerFecha(iso, zona) ?: return ""
    return fecha.format(if (fecha.toLocalDate() == hoy) HORA else DIA_Y_HORA)
}

/**
 * `.m-notifications`: borde, radio de 26, el lienzo y la sombra 2; la cabecera de 64 dp con la campana, el título y
 * cerrar; los filtros y «Marcar todas como leídas»; la lista que se desplaza y el pie. [altoMaximo] lo pone quien lo
 * coloca (620 dp en compacto y 520 desde 600, menos lo que ocupan las barras).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PanelDeAvisos(vm: CentroDeAvisosViewModel, acciones: AccionesDelPanel, altoMaximo: Dp, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.lg)
    Column(
        modifier.heightIn(max = altoMaximo).sombra2(forma, colores).clip(forma).background(colores.lienzo).border(1.dp, colores.contorno, forma)
            // Lo de dentro no cierra el panel.
            .clickable(enabled = false) {},
    ) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).background(colores.superficie)
                .drawBehind { drawLine(colores.contorno, Offset(0f, size.height - 0.5f), Offset(size.width, size.height - 0.5f), 1.dp.toPx()) }
                .padding(start = Espacios.e4, end = Espacios.e2, top = Espacios.e2, bottom = Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            Icon(painterResource(Iconos.notifications), contentDescription = null, tint = colores.primario)
            Text(
                "Notificaciones", Modifier.weight(1f), color = colores.tinta, maxLines = 1, overflow = TextOverflow.Ellipsis,
                style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold, fontSize = rem(1.18), lineHeight = rem(1.18 * 1.1)),
            )
            BotonDeIcono(Iconos.close, "Cerrar notificaciones", vm::cerrar)
        }
        Row(
            Modifier.fillMaxWidth().padding(horizontal = Espacios.e3, vertical = Espacios.e2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(Modifier.weight(1f).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Espacios.e1)) {
                Filtro("Todas", !vm.soloSinLeer) { vm.elegirFiltro(false) }
                Filtro(if (vm.contadores.noLeidas > 0) "Sin leer · ${vm.contadores.noLeidas}" else "Sin leer", vm.soloSinLeer) { vm.elegirFiltro(true) }
            }
            BotonDeIcono(Iconos.doneAll, "Marcar todas como leídas", vm::marcarTodas, color = colores.primario, habilitado = vm.contadores.noLeidas > 0)
        }
        Box(Modifier.weight(1f, fill = false)) {
            when {
                vm.cargando && vm.lista.isEmpty() -> Estado("Cargando…")
                vm.error.isNotEmpty() && vm.lista.isEmpty() -> Estado(vm.error, error = true)
                vm.lista.isEmpty() -> Estado(if (vm.soloSinLeer) "No tienes nada sin leer." else "Aún no tienes notificaciones.")
                else -> LazyColumn(
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(Espacios.e2),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    items(vm.lista, key = { it.id }) { aviso -> Notificacion(vm, aviso, acciones) }
                    if (vm.errorDeAccion.isNotEmpty()) item(key = "error") { Mensaje(vm.errorDeAccion) }
                }
            }
        }
        FlowRow(
            Modifier.fillMaxWidth().background(colores.superficie)
                .drawBehind { drawLine(colores.contorno, Offset(0f, 0.5f), Offset(size.width, 0.5f), 1.dp.toPx()) }
                .padding(horizontal = Espacios.e3, vertical = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End),
            verticalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            if (vm.cursor != null) {
                Boton(if (vm.cargandoMas) "Cargando…" else "Ver más", vm::verMas, variante = VarianteDeBoton.Contorno, habilitado = !vm.cargandoMas, rellenoHorizontal = Espacios.e3)
            }
            Boton("Preferencias", acciones.preferencias, variante = VarianteDeBoton.Contorno, rellenoHorizontal = Espacios.e3)
            Boton("Ver todas", acciones.verTodas, variante = VarianteDeBoton.Tonal, rellenoHorizontal = Espacios.e3)
        }
    }
}

@Composable
private fun Filtro(texto: String, activo: Boolean, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(50)
    Box(
        Modifier.heightIn(min = 40.dp).clip(forma)
            .background(if (activo) colores.contenedorPrimario else colores.superficie)
            .border(1.dp, if (activo) Color.Transparent else colores.contorno, forma)
            .clickable(role = Role.Tab, onClick = alPulsar)
            .padding(horizontal = Espacios.e3 + 1.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            texto, color = if (activo) colores.sobreContenedorPrimario else colores.tintaSuave,
            style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.Bold, lineHeight = rem(0.75)),
        )
    }
}

/** `.m-notification`: el icono de 42, el título con `xN` y la hora, el cuerpo y los botones; sin leer, en primario. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Notificacion(vm: CentroDeAvisosViewModel, aviso: AvisoDelCentro, acciones: AccionesDelPanel) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val abrir = { enlace: String? ->
        vm.pulsar(aviso)
        enlace?.let { acciones.abrirEnlace(aviso, it) }
    }
    Row(
        Modifier.fillMaxWidth().clip(forma)
            .background(if (!aviso.leida) mezclar(colores.contenedorPrimario, 0.58f, colores.superficie) else Color.Transparent)
            .drawBehind { drawLine(mezclar(colores.contorno, 0.72f), Offset(0f, size.height - 0.5f), Offset(size.width, size.height - 0.5f), 1.dp.toPx()) }
            .clickable(role = Role.Button) { abrir(aviso.enlace) }
            .padding(horizontal = Espacios.e3, vertical = Espacios.e4),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Imagen(acciones.imagen(aviso.actor?.avatar ?: aviso.imagenDelLogro ?: aviso.icono))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Text(aviso.titulo, Modifier.weight(1f), color = colores.tinta, style = Textos.filaPrincipal, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (aviso.cantidad > 1) {
                    Text(
                        "x${aviso.cantidad}",
                        Modifier.clip(RoundedCornerShape(50)).background(colores.primario).padding(horizontal = 7.dp, vertical = 3.dp),
                        color = colores.sobrePrimario, style = Textos.cuerpo.copy(fontSize = rem(0.65), lineHeight = rem(0.65)),
                    )
                }
                Text(cuando(aviso.actualizada), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.68)))
            }
            aviso.cuerpo?.takeIf { it.trim() != aviso.titulo.trim() }?.let {
                Text(it, Modifier.padding(top = Espacios.e2), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.85)))
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                aviso.botones.forEach { boton -> BotonDeTextoDelAviso(boton.texto) { abrir(boton.enlace) } }
                if (aviso.resuelta != null) {
                    Text(aviso.resuelta, Modifier.padding(top = Espacios.e3), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.Bold))
                } else {
                    val ocupada = aviso.id in vm.ocupadas
                    aviso.acciones.forEach { accion ->
                        BotonDeTextoDelAviso(accion.texto.ifEmpty { if (accion.clave == "aceptar") "Aceptar" else "Rechazar" }, habilitado = !ocupada) { vm.accion(aviso, accion.clave) }
                    }
                }
            }
        }
    }
}

/** El avatar de quien la provoca, la imagen del logro o el icono de la web; si no hay, la campana. */
@Composable
private fun Imagen(direccion: String?) {
    val colores = LocalColores.current
    Box(Modifier.size(42.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
        if (direccion == null) {
            Icon(painterResource(Iconos.notifications), contentDescription = null, tint = colores.primario)
        } else {
            AsyncImage(direccion, contentDescription = null, modifier = Modifier.size(42.dp), contentScale = ContentScale.Crop)
        }
    }
}

/** `.m-notification button`: texto del primario, 800 .8rem, 44 dp de alto. */
@Composable
private fun BotonDeTextoDelAviso(texto: String, habilitado: Boolean = true, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.padding(top = Espacios.e1).heightIn(min = 44.dp).clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(texto, color = colores.primario.copy(alpha = if (habilitado) 1f else 0.5f), style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.ExtraBold, lineHeight = rem(0.8)))
    }
}

@Composable
private fun Estado(texto: String, error: Boolean = false) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth().heightIn(min = 220.dp).padding(Espacios.e4),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterVertically),
    ) {
        Icon(painterResource(Iconos.notificationsNone), contentDescription = null, tint = if (error) colores.error else colores.primario, modifier = Modifier.size(56.dp))
        Text(texto, color = if (error) colores.error else colores.tintaSuave, style = Textos.cuerpo, textAlign = TextAlign.Center)
    }
}

/** `.m-notifications__message`: el error de una acción. */
@Composable
private fun Mensaje(texto: String) {
    val colores = LocalColores.current
    Text(
        texto,
        Modifier.fillMaxWidth().padding(Espacios.e3).clip(RoundedCornerShape(Radios.sm)).background(colores.contenedorError).padding(Espacios.e3)
            .widthIn(max = 600.dp),
        color = colores.error, style = Textos.cuerpo,
    )
}
