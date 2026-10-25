package es.yosiftware.libros.ui.mensajes

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.min
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.DialogoModal
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.comunidad.CampoDeFormulario
import es.yosiftware.libros.ui.comunidad.EstadoDePantalla
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra1
import java.time.Instant
import kotlinx.coroutines.delay

// La conversación: mobile-chat-conversation-view.component.html con el controlador chat-conversation.component.ts y el
// Sass de la APK de Capacitor (5dc3120). Rejilla de cinco filas: la app bar, la búsqueda, los mensajes (o la gestión del
// grupo encima, que tapa también el campo), la franja de error o de solo lectura y el campo de escribir.

/** Las cinco reacciones de Libros con su icono (`reactionOptions`): «Sorpresa» y «Triste» llevan los de la web. */
private val ICONOS_DE_REACCION = mapOf(
    TipoDeReaccion.ME_GUSTA to Iconos.favorite,
    TipoDeReaccion.RISA to Iconos.sentimentVerySatisfied,
    TipoDeReaccion.SORPRESA to Iconos.sentimentVeryDissatisfied,
    TipoDeReaccion.TRISTE to Iconos.sentimentDissatisfied,
    TipoDeReaccion.APOYO to Iconos.volunteerActivism,
)

@Composable
fun PantallaConversacion(vm: ConversacionViewModel, volver: () -> Unit, resaltado: Long? = null) {
    val colores = LocalColores.current
    val compacta = LocalVentana.current.anchoDp < 600
    // Marca leído solo con la pantalla a la vista y la app en primer plano.
    val ciclo = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(ciclo, vm) {
        val oyente = LifecycleEventObserver { _, evento ->
            when (evento) {
                Lifecycle.Event.ON_RESUME -> vm.alVerse(true)
                Lifecycle.Event.ON_PAUSE -> vm.alVerse(false)
                else -> Unit
            }
        }
        ciclo.addObserver(oyente)
        if (ciclo.currentState.isAtLeast(Lifecycle.State.RESUMED)) vm.alVerse(true)
        onDispose {
            ciclo.removeObserver(oyente)
            vm.alVerse(false)
        }
    }
    Column(Modifier.fillMaxSize().background(colores.lienzo)) {
        BarraDeLaConversacion(vm, volver, compacta)
        if (vm.busquedaAbierta) BarraDeBusquedaDelChat(vm)
        val detalle = vm.detalle
        if (vm.gestionAbierta && detalle?.tipo == "grupo") {
            Box(Modifier.weight(1f)) { GestionDelGrupo(vm, detalle, compacta) }
        } else {
            Box(Modifier.weight(1f)) {
                when {
                    vm.cargando -> EstadoDePantalla(Iconos.hourglassTop, "Cargando mensajes…", alturaMinima = 240)
                    vm.error.isNotEmpty() -> EstadoDePantalla(Iconos.cloudOff, vm.error, error = true, alturaMinima = 240, boton = "Reintentar" to vm::recargar)
                    else -> ListaDeMensajes(vm, compacta, resaltado)
                }
            }
            if (!vm.cargando && vm.error.isEmpty()) {
                if (vm.errorDeAccion.isNotEmpty()) Franja(vm.errorDeAccion, error = true)
                if (vm.puedeEscribir) Escritura(vm) else Franja("Esta conversación es de solo lectura.", error = false)
            }
        }
    }
    vm.borrarPendiente?.let {
        Confirmacion("¿Quieres borrar este mensaje?", vm::cancelarBorrar, vm::borrar)
    }
    if (vm.salirPendiente) Confirmacion("¿Quieres salir de este grupo?", vm::cancelarSalir, vm::salir)
    vm.retirarPendiente?.let { Confirmacion("¿Quieres retirar a ${it.persona.nombre} del grupo?", vm::cancelarRetirar, vm::retirar) }
    vm.denunciando?.let { DialogoDeDenuncia(vm, it) }
}

/** `.m-conversation__appbar`: volver, el título con los participantes (o quién escribe), gestionar y buscar. */
@Composable
private fun BarraDeLaConversacion(vm: ConversacionViewModel, volver: () -> Unit, compacta: Boolean) {
    val colores = LocalColores.current
    val detalle = vm.detalle
    Row(
        Modifier.fillMaxWidth().heightIn(min = 68.dp).background(colores.superficie)
            .drawBehind { drawLine(colores.contorno, Offset(0f, size.height - 0.5f), Offset(size.width, size.height - 0.5f), 1.dp.toPx()) }
            .padding(horizontal = Espacios.e3, vertical = Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e1),
    ) {
        BotonDeIcono(Iconos.arrowBack, "Volver a conversaciones", volver)
        Column(Modifier.weight(1f)) {
            Text(
                detalle?.titulo ?: "Chat", color = colores.tinta,
                style = Textos.filaPrincipal.copy(fontFamily = Fuentes.display), maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(
                vm.textoDeEscribiendo() ?: "${detalle?.participantes?.size ?: 0} participantes",
                Modifier.padding(top = 2.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.68)),
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        if (detalle?.tipo == "grupo") {
            BotonDeIcono(if (vm.gestionAbierta) Iconos.close else Iconos.settings, "Gestionar grupo", vm::alternarGestion)
        } else if (compacta) {
            // En compacto la rejilla reserva sus 48 dp aunque no haya botón (`48px minmax(0, 1fr) 48px 48px`).
            Box(Modifier.size(48.dp))
        }
        BotonDeIcono(Iconos.search, "Buscar mensajes", vm::alternarBusqueda)
    }
}

/** `.m-conversation__search`: la lupa, el campo, buscar y, con resultados, cerrarlos. */
@Composable
private fun BarraDeBusquedaDelChat(vm: ConversacionViewModel) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).background(colores.superficie)
            .drawBehind { drawLine(colores.contorno, Offset(0f, size.height - 0.5f), Offset(size.width, size.height - 0.5f), 1.dp.toPx()) }
            .padding(horizontal = Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e1),
    ) {
        Icon(painterResource(Iconos.search), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
        BasicTextField(
            vm.busqueda, { vm.busqueda = it }, Modifier.weight(1f).heightIn(min = 54.dp),
            singleLine = true,
            textStyle = Textos.cuerpo.copy(color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { vm.buscar() }),
            decorationBox = { interior ->
                Box(Modifier.heightIn(min = 54.dp), contentAlignment = Alignment.CenterStart) {
                    if (vm.busqueda.isEmpty()) Text("Buscar mensajes", color = colores.tintaSuave, style = Textos.cuerpo, maxLines = 1)
                    interior()
                }
            },
        )
        BotonDeIcono(Iconos.arrowForward, "Buscar", vm::buscar, habilitado = vm.busqueda.trim().length >= 2 && !vm.buscando)
        if (vm.resultados != null) BotonDeIcono(Iconos.close, "Cerrar resultados", vm::cerrarResultados)
    }
}

@Composable
private fun ListaDeMensajes(vm: ConversacionViewModel, compacta: Boolean, resaltado: Long?) {
    val visibles = vm.visibles
    val inicio = vm.posicion
    val estado = rememberLazyListState(inicio?.first ?: Int.MAX_VALUE.coerceAtMost(visibles.size + 1), inicio?.second ?: 0)
    // Guarda dónde se dejó (por cuenta y conversación: el ViewModel es de las dos).
    DisposableEffect(estado) {
        onDispose { vm.posicion = estado.firstVisibleItemIndex to estado.firstVisibleItemScrollOffset }
    }
    // El mensaje de un aviso, al centro.
    LaunchedEffect(resaltado, visibles.size) {
        val indice = visibles.indexOfFirst { it.id == resaltado }
        if (resaltado != null && indice >= 0) estado.animateScrollToItem(indice + (if (vm.cursor != null) 1 else 0), -200)
    }
    // Editar caduca con el reloj: se vuelve a mirar cada 30 segundos.
    var ahora by remember { mutableStateOf(Instant.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            ahora = Instant.now()
        }
    }
    val relleno = if (compacta) Espacios.e3 else Espacios.e4
    LazyColumn(
        Modifier.fillMaxSize(),
        state = estado,
        contentPadding = PaddingValues(relleno),
        verticalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        if (vm.cursor != null) {
            item(key = "anteriores") {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Boton(if (vm.cargandoMas) "Cargando…" else "Mensajes anteriores", vm::cargarAnteriores, variante = VarianteDeBoton.Contorno, habilitado = !vm.cargandoMas)
                }
            }
        }
        if (visibles.isEmpty()) {
            item(key = "vacio") {
                Text(
                    if (vm.resultados != null) "No hay mensajes que coincidan con la búsqueda." else "Aún no hay mensajes en esta conversación.",
                    Modifier.fillMaxWidth().padding(vertical = Espacios.e6), color = LocalColores.current.tintaSuave, style = Textos.cuerpo, textAlign = TextAlign.Center,
                )
            }
        }
        items(visibles, key = { it.id }) { mensaje ->
            Burbuja(vm, mensaje, compacta, resaltado == mensaje.id, ahora)
        }
    }
}

/** `.m-message`: la burbuja, con su cabecera, la cita, el texto (o su edición) y el pie de acciones. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Burbuja(vm: ConversacionViewModel, mensaje: MensajeDelChat, compacta: Boolean, resaltada: Boolean, ahora: Instant) {
    val colores = LocalColores.current
    val propio = mensaje.propio
    val forma = when {
        propio -> RoundedCornerShape(Radios.md, Radios.md, 4.dp, Radios.md)
        else -> RoundedCornerShape(Radios.md, Radios.md, Radios.md, 4.dp)
    }
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val ancho = if (compacta) maxWidth * 0.91f else min(maxWidth * 0.86f, 620.dp)
        val alineacion = when {
            mensaje.sistema -> Alignment.Center
            propio -> Alignment.CenterEnd
            else -> Alignment.CenterStart
        }
        Box(Modifier.fillMaxWidth(), contentAlignment = alineacion) {
            Column(
                Modifier.width(ancho)
                    .then(if (resaltada) Modifier.drawBehind { contorno(colores.primario) } else Modifier)
                    .sombra1(forma, colores)
                    .clip(forma)
                    .background(if (propio) colores.contenedorPrimario else colores.superficie)
                    .then(
                        when {
                            propio -> Modifier
                            mensaje.sistema -> Modifier.drawBehind { bordeDiscontinuo(colores.contorno) }
                            else -> Modifier.border(1.dp, colores.contorno, forma)
                        },
                    )
                    .padding(Espacios.e3),
                verticalArrangement = Arrangement.spacedBy(Espacios.e2),
            ) {
                Text(TextosDelChat.cabecera(mensaje), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.66)))
                if (mensaje.eliminado) {
                    Text("Mensaje eliminado", color = colores.tinta, style = Textos.cuerpo.copy(fontStyle = FontStyle.Italic))
                    return@Column
                }
                mensaje.respondido?.let { Cita(TextosDelChat.textoDeCita(it)) }
                if (vm.editando == mensaje.id) {
                    Edicion(vm, mensaje)
                } else {
                    Text(mensaje.texto, color = colores.tinta, style = Textos.cuerpo)
                }
                Pie(vm, mensaje, ahora)
            }
        }
    }
}

/** El contorno de 3 dp del primario al 42 %, separado 2 dp, del mensaje de un aviso (`.is-highlighted`). */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.contorno(primario: Color) {
    val separacion = 2.dp.toPx() + 1.5.dp.toPx()
    drawRoundRect(
        primario.copy(alpha = 0.42f), Offset(-separacion, -separacion),
        androidx.compose.ui.geometry.Size(size.width + 2 * separacion, size.height + 2 * separacion),
        CornerRadius(18.dp.toPx() + separacion), style = Stroke(3.dp.toPx()),
    )
}

/** El borde discontinuo de los avisos del sistema (`border-style: dashed`). */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.bordeDiscontinuo(color: Color) {
    val grosor = 1.dp.toPx()
    drawRoundRect(
        color, Offset(grosor / 2, grosor / 2), androidx.compose.ui.geometry.Size(size.width - grosor, size.height - grosor),
        CornerRadius(18.dp.toPx()), style = Stroke(grosor, pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 3.dp.toPx()))),
    )
}

/** `.m-message__reply`: la cita, con la flecha y el borde izquierdo del primario. */
@Composable
private fun Cita(texto: String) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().background(colores.superficieContenedor)
            .drawBehind { drawRect(colores.primario, size = androidx.compose.ui.geometry.Size(3.dp.toPx(), size.height)) }
            .padding(start = Espacios.e2 + 3.dp, top = Espacios.e2, end = Espacios.e2, bottom = Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        Icon(painterResource(Iconos.reply), contentDescription = null, tint = colores.tintaSuave)
        Text(texto, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.76)), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** `.m-message__edit`: el área de 3 filas, «Cancelar» y «Guardar». */
@Composable
private fun Edicion(vm: ConversacionViewModel, mensaje: MensajeDelChat) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        CampoDeFormulario(vm.textoDeEdicion, { vm.textoDeEdicion = it }, "", Modifier.heightIn(min = 88.dp), lineas = 3, maximo = ConversacionViewModel.MAXIMO)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
            Boton("Cancelar", vm::cancelarEdicion, variante = VarianteDeBoton.Contorno)
            Boton("Guardar", { vm.guardarEdicion(mensaje) }, habilitado = vm.textoDeEdicion.isNotBlank() && !vm.guardandoEdicion)
        }
    }
}

/** El pie (`footer`): responder, las reacciones, denunciar, reintentar, editar y borrar, en ese orden. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Pie(vm: ConversacionViewModel, mensaje: MensajeDelChat, ahora: Instant) {
    val colores = LocalColores.current
    val permisos = mensaje.permisos
    val fallido = mensaje.envio == EstadoDeEnvio.FALLIDO
    val editar = vm.puedeEditar(mensaje, ahora)
    FlowRow(
        Modifier.fillMaxWidth()
            .drawBehind { drawLine(colores.contorno, Offset(0f, 0.5f), Offset(size.width, 0.5f), 1.dp.toPx()) }
            .padding(top = Espacios.e1 + 1.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        if (permisos.responder) BotonPequeno(Iconos.reply, "Responder") { vm.responder(mensaje) }
        if (permisos.reaccionar) {
            TipoDeReaccion.entries.forEach { tipo ->
                Reaccion(
                    activa = mensaje.reacciones.mia == tipo, descripcion = tipo.etiqueta, habilitada = true,
                    alPulsar = { vm.reaccionar(mensaje, tipo.emoji) }, cuantas = mensaje.reacciones.porTipo[tipo] ?: 0, icono = ICONOS_DE_REACCION.getValue(tipo),
                )
            }
        }
        mensaje.reacciones.otras.forEach { (emoji, total) ->
            Reaccion(
                activa = vm.esMiEmoji(mensaje, emoji), descripcion = "Reacción $emoji", habilitada = permisos.reaccionar,
                alPulsar = { vm.reaccionar(mensaje, emoji) }, cuantas = total, emoji = emoji,
            )
        }
        if (permisos.denunciar) BotonPequeno(Iconos.flag, "Denunciar mensaje") { vm.pedirDenuncia(mensaje) }
        if (fallido) {
            Box(
                Modifier.heightIn(min = 40.dp).clickable(role = Role.Button) { vm.reintentar(mensaje) }.padding(horizontal = Espacios.e2),
                contentAlignment = Alignment.Center,
            ) {
                Text("Reintentar", color = colores.error, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, lineHeight = rem(0.72)))
            }
        }
        if (editar) BotonPequeno(Iconos.edit, "Editar") { vm.empezarAEditar(mensaje) }
        if (permisos.borrar) BotonPequeno(Iconos.deleteOutline, "Borrar", colores.error) { vm.pedirBorrar(mensaje) }
    }
}

/** `.m-icon-button` del pie: 40 dp. */
@Composable
private fun BotonPequeno(@DrawableRes icono: Int, descripcion: String, color: Color = LocalColores.current.tinta, alPulsar: () -> Unit) {
    Box(Modifier.size(40.dp).clip(CircleShape).clickable(role = Role.Button, onClick = alPulsar), contentAlignment = Alignment.Center) {
        Icon(painterResource(icono), contentDescription = descripcion, tint = color, modifier = Modifier.size(24.dp))
    }
}

/** `.m-message__reaction`: la píldora de 40 dp con el icono (o el emoji) y el total; la mía, en el primario. */
@Composable
private fun Reaccion(
    activa: Boolean,
    descripcion: String,
    habilitada: Boolean,
    alPulsar: () -> Unit,
    cuantas: Int,
    @DrawableRes icono: Int? = null,
    emoji: String? = null,
) {
    val colores = LocalColores.current
    val tinta = if (activa) colores.primario else colores.tintaSuave
    Row(
        Modifier.widthIn(min = 40.dp).heightIn(min = 40.dp).clip(RoundedCornerShape(50))
            .background(if (activa) colores.contenedorPrimario else Color.Transparent)
            .clickable(enabled = habilitada, role = Role.Button, onClickLabel = descripcion, onClick = alPulsar)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterHorizontally),
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = descripcion, tint = tinta, modifier = Modifier.size(20.dp))
        if (emoji != null) Text(emoji, style = Textos.cuerpo)
        if (cuantas > 0) Text("$cuantas", color = tinta, style = Textos.cuerpo.copy(fontSize = rem(0.66)))
    }
}

/** `.m-conversation__error` y `.m-conversation__readonly`: la franja entre los mensajes y el campo. */
@Composable
private fun Franja(texto: String, error: Boolean) {
    val colores = LocalColores.current
    Text(
        texto,
        Modifier.fillMaxWidth().background(if (error) colores.contenedorError else colores.superficieContenedor).padding(horizontal = Espacios.e4, vertical = Espacios.e2),
        color = if (error) colores.error else colores.tintaSuave, style = Textos.cuerpo, textAlign = TextAlign.Center,
    )
}

/** `.m-conversation__composer`: «Respondiendo a…», el área de 48 a 132 dp y el botón redondo de enviar. */
@Composable
private fun Escritura(vm: ConversacionViewModel) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth().background(colores.superficie)
            .drawBehind { drawLine(colores.contorno, Offset(0f, 0.5f), Offset(size.width, 0.5f), 1.dp.toPx()) }
            .padding(horizontal = Espacios.e3, vertical = Espacios.e2),
        verticalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        vm.respondiendo?.let { respondido ->
            Row(
                Modifier.fillMaxWidth()
                    .drawBehind { drawRect(colores.primario, size = androidx.compose.ui.geometry.Size(3.dp.toPx(), size.height)) }
                    .padding(start = Espacios.e3 + 3.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
            ) {
                Text(
                    "Respondiendo a: ${respondido.texto}", Modifier.weight(1f), color = colores.tintaSuave,
                    style = Textos.cuerpo.copy(fontSize = rem(0.75)), maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                BotonDeIcono(Iconos.close, "Cancelar respuesta", vm::cancelarRespuesta)
            }
        }
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            val forma = RoundedCornerShape(Radios.lg)
            BasicTextField(
                vm.borrador, vm::escribir,
                Modifier.weight(1f).heightIn(min = 48.dp, max = 132.dp).clip(forma).background(colores.superficieContenedor)
                    .border(1.dp, colores.contornoFuerte, forma),
                textStyle = Textos.cuerpo.copy(color = colores.tinta),
                cursorBrush = SolidColor(colores.primario),
                minLines = 1,
                decorationBox = { interior ->
                    Box(Modifier.padding(horizontal = Espacios.e3 + 1.dp, vertical = 13.dp), contentAlignment = Alignment.CenterStart) {
                        if (vm.borrador.isEmpty()) Text("Escribe un mensaje", color = colores.tintaSuave, style = Textos.cuerpo, maxLines = 1)
                        interior()
                    }
                },
            )
            val puede = vm.borrador.isNotBlank() && !vm.enviando
            Box(
                Modifier.size(48.dp).clip(CircleShape).background(colores.primario).clickable(enabled = puede, role = Role.Button, onClick = vm::enviar),
                contentAlignment = Alignment.Center,
            ) {
                Icon(painterResource(Iconos.send), contentDescription = "Enviar", tint = colores.sobrePrimario)
            }
        }
    }
}

/** `.m-conversation-management`: participantes, renombrar, los roles, retirar, añadir amistades y salir. */
@Composable
private fun GestionDelGrupo(vm: ConversacionViewModel, detalle: DetalleDelChat, compacta: Boolean) {
    val colores = LocalColores.current
    val ocupado = vm.accionDeGestion.isNotEmpty()
    Column(
        Modifier.fillMaxSize().background(colores.lienzo).verticalScroll(rememberScrollState()).padding(if (compacta) Espacios.e3 else Espacios.e4),
        verticalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = if (compacta) Alignment.Top else Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Column(Modifier.weight(1f)) {
                Text("Participantes", color = colores.tinta, style = Textos.filaPrincipal)
                Text("${detalle.participantes.size} / 50", color = colores.tintaSuave, style = Textos.cuerpo)
            }
            BotonDeSalir(vm::pedirSalir, habilitado = !ocupado)
        }
        if (detalle.puedeGestionar) {
            val puedeGuardar = vm.nombreDelGrupo.trim().length >= MensajesViewModel.MINIMO_DEL_TITULO && !ocupado
            if (compacta) {
                CampoDeFormulario(vm.nombreDelGrupo, { vm.nombreDelGrupo = it }, "Nombre del grupo", maximo = MensajesViewModel.MAXIMO_DEL_TITULO)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) { Boton("Guardar nombre", vm::renombrar, habilitado = puedeGuardar) }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                    CampoDeFormulario(vm.nombreDelGrupo, { vm.nombreDelGrupo = it }, "Nombre del grupo", Modifier.weight(1f), maximo = MensajesViewModel.MAXIMO_DEL_TITULO)
                    Boton("Guardar nombre", vm::renombrar, habilitado = puedeGuardar)
                }
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            detalle.participantes.forEach { participante ->
                FilaDeParticipante(
                    Iconos.person, participante.persona.nombre, if (participante.admin) "Administrador" else "Miembro",
                ) {
                    if (detalle.puedeGestionar && participante.persona.id != vm.yoId) {
                        BotonDeIcono(Iconos.adminPanelSettings, if (participante.admin) "Hacer miembro" else "Hacer administrador", { vm.cambiarRol(participante) }, habilitado = !ocupado)
                        BotonDeIcono(Iconos.personRemove, "Retirar participante", { vm.pedirRetirar(participante) }, color = colores.error, habilitado = !ocupado)
                    }
                }
            }
        }
        if (detalle.puedeGestionar) {
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Text("Añadir amistades", color = colores.tinta, style = Textos.filaPrincipal)
                if (vm.cargandoGestion) Text("Cargando candidatos…", color = colores.tintaSuave, style = Textos.cuerpo)
                if (vm.candidatos.isEmpty()) {
                    if (!vm.cargandoGestion) Text("No hay amistades elegibles fuera del grupo.", color = colores.tintaSuave, style = Textos.cuerpo)
                } else {
                    vm.candidatos.forEach { persona ->
                        FilaDeParticipante(Iconos.personAdd, persona.nombre, "Añadir al grupo", alPulsar = if (ocupado) null else ({ vm.invitar(persona) }))
                    }
                }
            }
        }
        if (vm.errorDeGestion.isNotEmpty()) Franja(vm.errorDeGestion, error = true)
    }
}

/** `.m-button--outline.is-danger`: «Salir», en el color de error. */
@Composable
private fun BotonDeSalir(alPulsar: () -> Unit, habilitado: Boolean) {
    val colores = LocalColores.current
    Row(
        Modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(50)).border(1.dp, colores.contorno, RoundedCornerShape(50))
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar).padding(horizontal = 21.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        Icon(painterResource(Iconos.logout), contentDescription = null, tint = colores.error, modifier = Modifier.size(24.dp))
        Text("Salir", color = colores.error, style = Textos.boton)
    }
}

/** Un `.m-list-item` con borde de la gestión: icono, nombre, línea de apoyo y, a la derecha, sus botones. */
@Composable
private fun FilaDeParticipante(
    @DrawableRes icono: Int,
    nombre: String,
    apoyo: String,
    alPulsar: (() -> Unit)? = null,
    acciones: @Composable () -> Unit = {},
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)
            .then(if (alPulsar != null) Modifier.clickable(role = Role.Button, onClick = alPulsar) else Modifier)
            .padding(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
            Icon(painterResource(icono), contentDescription = null, tint = colores.primario)
        }
        Column(Modifier.weight(1f)) {
            Text(nombre, color = colores.tinta, style = Textos.filaPrincipal, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(apoyo, Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Row { acciones() }
    }
}

@Composable
private fun Confirmacion(texto: String, alCancelar: () -> Unit, alAceptar: () -> Unit) {
    DialogoModal(alCerrar = alCancelar) {
        Text(texto, color = LocalColores.current.tinta, style = Textos.cuerpo)
        Row(Modifier.fillMaxWidth().padding(top = Espacios.e5), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
            Boton("Cancelar", alCancelar, variante = VarianteDeBoton.Contorno)
            Boton("Aceptar", alAceptar)
        }
    }
}

/**
 * La denuncia de un mensaje a la moderación de Yosiftware. En la web la abre la ventana del SDK; aquí, un diálogo con
 * los motivos de la plataforma y un texto opcional (hasta 500 caracteres).
 */
@Composable
private fun DialogoDeDenuncia(vm: ConversacionViewModel, mensaje: MensajeDelChat) {
    val colores = LocalColores.current
    DialogoModal(alCerrar = vm::cancelarDenuncia) {
        Text("Denunciar mensaje", color = colores.tinta, style = Textos.filaPrincipal)
        Text(
            "«${mensaje.texto.take(280)}»", Modifier.padding(top = Espacios.e2), color = colores.tintaSuave,
            style = Textos.cuerpo.copy(fontSize = rem(0.8)), maxLines = 3, overflow = TextOverflow.Ellipsis,
        )
        Column(Modifier.padding(top = Espacios.e3), verticalArrangement = Arrangement.spacedBy(Espacios.e1)) {
            if (vm.motivos.isEmpty() && vm.errorDeDenuncia.isEmpty()) Text("Cargando motivos…", color = colores.tintaSuave, style = Textos.cuerpo)
            vm.motivos.forEach { motivo ->
                val elegido = vm.motivoElegido == motivo.clave
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(Radios.sm))
                        .background(if (elegido) colores.contenedorPrimario else Color.Transparent)
                        .clickable(role = Role.RadioButton) { vm.motivoElegido = motivo.clave }.padding(horizontal = Espacios.e3),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(motivo.nombre, color = if (elegido) colores.sobreContenedorPrimario else colores.tinta, style = Textos.cuerpo)
                }
            }
        }
        CampoDeFormulario(vm.textoDeDenuncia, { vm.textoDeDenuncia = it }, "Cuéntalo si quieres (opcional)", Modifier.padding(top = Espacios.e3), lineas = 3, maximo = 500)
        if (vm.errorDeDenuncia.isNotEmpty()) Text(vm.errorDeDenuncia, Modifier.padding(top = Espacios.e2), color = colores.error, style = Textos.cuerpo)
        Row(Modifier.fillMaxWidth().padding(top = Espacios.e5), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
            Boton("Cancelar", vm::cancelarDenuncia, variante = VarianteDeBoton.Contorno)
            Boton(if (vm.enviandoDenuncia) "Enviando…" else "Enviar", vm::enviarDenuncia, habilitado = vm.motivoElegido != null && !vm.enviandoDenuncia)
        }
    }
}
