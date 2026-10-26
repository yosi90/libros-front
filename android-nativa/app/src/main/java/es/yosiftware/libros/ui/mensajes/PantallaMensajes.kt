package es.yosiftware.libros.ui.mensajes

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.comunidad.CampoDeFormulario
import es.yosiftware.libros.ui.comunidad.ElementoDeLista
import es.yosiftware.libros.ui.comunidad.EstadoDePantalla
import es.yosiftware.libros.ui.comunidad.FechasDeClubes
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

// Comunidad › Mensajes: mobile-chat-view.component.html con el controlador chat.component.ts y el Sass de la APK de
// Capacitor (5dc3120, mobile-chat-view.component.sass). En la vista Mobile no hay lista y conversación lado a lado: con
// una abierta, la bandeja se esconde (`has-active-conversation`).

/**
 * La bandeja o, si hay una abierta, la conversación ([conversacion]). Atrás, con una abierta, vuelve a la bandeja.
 */
@Composable
fun PantallaMensajes(vm: MensajesViewModel, bandeja: BandejaDeChat, conversacion: @Composable (Long) -> Unit) {
    val abierta = vm.abierta
    BackHandler(enabled = abierta != null) { vm.cerrar() }
    if (abierta != null) {
        conversacion(abierta)
        return
    }
    val estado by bandeja.estado.collectAsStateWithLifecycle()
    val compacta = LocalVentana.current.anchoDp < 600
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if (compacta) Espacios.e3 else Espacios.e4),
        verticalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Filtros(vm)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Boton("Nuevo chat", { vm.alternarCreador(Creador.DIRECTO) }, Modifier.weight(1f), icono = Iconos.addComment, rellenoHorizontal = Espacios.e2)
            Boton("Nuevo grupo", { vm.alternarCreador(Creador.GRUPO) }, Modifier.weight(1f), variante = VarianteDeBoton.Tonal, icono = Iconos.groupAdd, rellenoHorizontal = Espacios.e2)
        }
        vm.creador?.let { Creador(vm, it) }
        if (vm.avisoDeAcceso.isNotEmpty()) Recuadro(vm.avisoDeAcceso)
        when {
            estado.cargando -> EstadoDePantalla(Iconos.hourglassTop, "Cargando conversaciones…", tamanoIcono = 44, alturaMinima = 180)
            estado.error != null -> EstadoDePantalla(
                Iconos.cloudOff, estado.error, error = true, tamanoIcono = 44, alturaMinima = 180,
                boton = "Reintentar" to vm::recargar,
            )
            else -> {
                val lista = estado.conversaciones.filter { TextosDelChat.cumple(it, vm.filtro) }
                if (lista.isEmpty()) {
                    EstadoDePantalla(Iconos.chatBubbleOutline, "No hay conversaciones en este filtro.", tamanoIcono = 44, alturaMinima = 180)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        lista.forEach { FilaDeConversacion(it) { vm.abrir(it.id) } }
                    }
                }
            }
        }
    }
}

/** `.m-messages__filters`: las píldoras de 40 dp, con desplazamiento horizontal y sin barra. */
@Composable
private fun Filtros(vm: MensajesViewModel) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Espacios.e1)) {
        FiltroDeChat.entries.forEach { filtro ->
            val activo = vm.filtro == filtro
            val forma = RoundedCornerShape(50)
            Box(
                Modifier.heightIn(min = 40.dp).clip(forma)
                    .background(if (activo) colores.contenedorPrimario else colores.superficie)
                    .border(1.dp, if (activo) Color.Transparent else colores.contorno, forma)
                    .clickable(role = Role.Tab) { vm.filtro = filtro }
                    .padding(horizontal = Espacios.e3 + 1.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    filtro.etiqueta,
                    color = if (activo) colores.sobreContenedorPrimario else colores.tintaSuave,
                    style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.Bold, lineHeight = rem(0.75)),
                )
            }
        }
    }
}

/** `.m-message-creator`: «Iniciar un directo» con las amistades, o «Crear grupo privado» con su formulario. */
@Composable
private fun Creador(vm: MensajesViewModel, tipo: Creador) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (tipo == Creador.DIRECTO) "Iniciar un directo" else "Crear grupo privado",
                    Modifier.weight(1f), color = colores.tinta, style = Textos.filaPrincipal,
                )
                BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarCreador)
            }
            if (vm.cargandoAmistades) Parrafo("Cargando amistades…")
            if (!vm.cargandoAmistades && tipo == Creador.DIRECTO) {
                if (vm.amistades.isEmpty()) {
                    Parrafo("No hay amistades disponibles para iniciar un directo.")
                } else {
                    vm.amistades.forEach { persona ->
                        ElementoDeLista(Iconos.person, persona.nombre, "Abrir conversación directa", alPulsar = if (vm.creando) null else ({ vm.iniciarDirecto(persona) }))
                    }
                }
            }
            if (tipo == Creador.GRUPO) FormularioDeGrupo(vm)
            if (vm.errorDelCreador.isNotEmpty()) Recuadro(vm.errorDelCreador, error = true)
        }
    }
}

@Composable
private fun FormularioDeGrupo(vm: MensajesViewModel) {
    val colores = LocalColores.current
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        CampoDeFormulario(vm.tituloDelGrupo, { vm.tituloDelGrupo = it }, "Nombre del grupo", maximo = MensajesViewModel.MAXIMO_DEL_TITULO)
        CampoDeFormulario(vm.busquedaDelGrupo, { vm.busquedaDelGrupo = it }, "Buscar personas para invitar", maximo = MensajesViewModel.MAXIMO_DE_LA_BUSQUEDA)
        val candidatos = vm.candidatos
        if (candidatos.isEmpty()) {
            if (!vm.cargandoAmistades) Parrafo("No hay personas elegibles con ese criterio.")
        } else {
            candidatos.forEach { persona ->
                val marcada = persona.id in vm.elegidas
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable(role = Role.Checkbox) { vm.alternarElegida(persona.id) },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                ) {
                    Checkbox(marcada, { vm.alternarElegida(persona.id) }, Modifier.size(22.dp), colors = CheckboxDefaults.colors(checkedColor = colores.primario))
                    Column {
                        Text(persona.nombre, color = colores.tinta, style = Textos.cuerpo)
                        Text("Amistad", color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Boton(if (vm.creando) "Creando…" else "Crear grupo", vm::crearGrupo, habilitado = vm.puedeCrearGrupo)
        }
    }
}

/** Una fila de la bandeja (`.m-list-item` con borde): icono por tipo, título, vista previa, fecha y no leídos. */
@Composable
private fun FilaDeConversacion(conversacion: ConversacionDelChat, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(forma).background(colores.superficie)
            .border(1.dp, colores.contorno, forma)
            .clickable(role = Role.Button, onClick = alPulsar)
            .padding(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
            Icon(painterResource(TextosDelChat.icono(conversacion)), contentDescription = null, tint = colores.primario)
        }
        Column(Modifier.weight(1f)) {
            Text(TextosDelChat.titulo(conversacion), color = colores.tinta, style = Textos.filaPrincipal, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                conversacion.vistaPrevia?.takeIf { it.isNotEmpty() } ?: "Sin mensajes aún",
                Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)),
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            val fecha = FechasDeClubes.diaYHora(conversacion.fechaUltimoMensaje)
            if (fecha.isNotEmpty()) {
                Text(fecha, Modifier.padding(top = Espacios.e1), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.68)))
            }
        }
        if (conversacion.noLeidos > 0) {
            Text(
                if (conversacion.noLeidos > 99) "99+" else "${conversacion.noLeidos}",
                Modifier.widthIn(min = 24.dp).clip(RoundedCornerShape(50)).background(colores.primario).padding(5.dp),
                color = colores.sobrePrimario,
                style = Textos.cuerpo.copy(fontSize = rem(0.65), fontWeight = FontWeight.Bold, lineHeight = rem(0.65)),
                textAlign = TextAlign.Center,
            )
        } else {
            Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tintaSuave)
        }
    }
}

/** `.m-message-creator > p`. */
@Composable
private fun Parrafo(texto: String) {
    Text(texto, color = LocalColores.current.tintaSuave, style = Textos.cuerpo)
}

/** `.m-messages__notice` (contenedor primario) o `.m-messages__error` (contenedor de error). */
@Composable
internal fun Recuadro(texto: String, error: Boolean = false) {
    val colores = LocalColores.current
    Text(
        texto,
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm))
            .background(if (error) colores.contenedorError else colores.contenedorPrimario)
            .padding(Espacios.e3),
        color = if (error) colores.error else colores.sobreContenedorPrimario,
        style = Textos.cuerpo,
    )
}
