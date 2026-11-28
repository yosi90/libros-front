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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.FilaDeLista
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Cargando
import es.yosiftware.libros.ui.componentes.ListaVacia
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.comunidad.CampoDeFormulario
import es.yosiftware.libros.ui.comunidad.EstadoDePantalla
import es.yosiftware.libros.ui.comunidad.FechasDeClubes
import es.yosiftware.libros.ui.tema.Alturas
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
 * [avatar] completa la ruta de una miniatura de la plataforma (la foto de cada persona).
 */
@Composable
fun PantallaMensajes(
    vm: MensajesViewModel,
    bandeja: BandejaDeChat,
    avatar: (String?) -> String? = { null },
    conversacion: @Composable (Long) -> Unit,
) {
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
            // Con la palabra, sin icono (ronda 1 de interfaz).
            Boton("Nuevo chat", { vm.alternarCreador(Creador.DIRECTO) }, Modifier.weight(1f), rellenoHorizontal = Espacios.e2)
            Boton("Nuevo grupo", { vm.alternarCreador(Creador.GRUPO) }, Modifier.weight(1f), variante = VarianteDeBoton.Tonal, rellenoHorizontal = Espacios.e2)
        }
        vm.creador?.let { Creador(vm, it, avatar) }
        if (vm.avisoDeAcceso.isNotEmpty()) Recuadro(vm.avisoDeAcceso)
        when {
            estado.cargando -> Cargando("Cargando las conversaciones", alturaMinima = 180.dp)
            estado.error != null -> EstadoDePantalla(
                Iconos.cloudOff, estado.error, error = true, tamanoIcono = 44, alturaMinima = 180,
                boton = "Reintentar" to vm::recargar,
            )
            else -> {
                val lista = estado.conversaciones.filter { TextosDelChat.cumple(it, vm.filtro) }
                if (lista.isEmpty()) {
                    ListaVacia("Sin conversaciones")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        lista.forEach { FilaDeConversacion(it, avatar) { vm.abrir(it.id) } }
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

/**
 * `.m-message-creator`: las amistades para un directo, o el formulario del grupo. Sin título: lo dice el botón que lo
 * abrió (ronda 1 de interfaz); la X, arriba a la derecha.
 */
@Composable
private fun Creador(vm: MensajesViewModel, tipo: Creador, avatar: (String?) -> String?) {
    Tarjeta(Modifier.fillMaxWidth()) {
        Box(Modifier.fillMaxWidth()) {
            Column(Modifier.fillMaxWidth().padding(end = Alturas.botonDeIcono), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                if (vm.cargandoAmistades) Cargando("Cargando las amistades", alturaMinima = 72.dp, tamano = 24.dp)
                if (!vm.cargandoAmistades && tipo == Creador.DIRECTO) {
                    if (vm.amistades.isEmpty()) {
                        ListaVacia("Sin amistades", alturaMinima = 72.dp)
                    } else {
                        Column {
                            vm.amistades.forEach { persona ->
                                FilaDeLista(
                                    persona.nombre, Modifier.fillMaxWidth(), lineasDelTitulo = 1,
                                    inicio = { Avatar(36.dp, url = avatar(persona.imagen), nombre = persona.nombre, conBorde = false) },
                                    alPulsar = if (vm.creando) null else ({ vm.iniciarDirecto(persona) }),
                                )
                            }
                        }
                    }
                }
                if (tipo == Creador.GRUPO) FormularioDeGrupo(vm)
                if (vm.errorDelCreador.isNotEmpty()) Recuadro(vm.errorDelCreador, error = true)
            }
            BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarCreador, Modifier.align(Alignment.TopEnd).offset(x = Espacios.e2, y = -Espacios.e2))
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
            if (!vm.cargandoAmistades) ListaVacia(if (vm.busquedaDelGrupo.isBlank()) "Sin amistades" else "Sin coincidencias", alturaMinima = 72.dp)
        } else {
            candidatos.forEach { persona ->
                val marcada = persona.id in vm.elegidas
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable(role = Role.Checkbox) { vm.alternarElegida(persona.id) },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                ) {
                    Checkbox(marcada, { vm.alternarElegida(persona.id) }, Modifier.size(22.dp), colors = CheckboxDefaults.colors(checkedColor = colores.primario))
                    // Todas son amistades: sin «Amistad» debajo de cada nombre.
                    Text(persona.nombre, color = colores.tinta, style = Textos.cuerpo)
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Boton(if (vm.creando) "Creando…" else "Crear grupo", vm::crearGrupo, habilitado = vm.puedeCrearGrupo)
        }
    }
}

/**
 * Una fila de la bandeja (`.m-list-item` con borde): la foto de la otra persona o la inicial del título (no el icono de
 * su tipo, que ya dicen los filtros), el título, la vista previa y, a la derecha, la fecha y los no leídos.
 */
@Composable
private fun FilaDeConversacion(conversacion: ConversacionDelChat, avatar: (String?) -> String?, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val titulo = TextosDelChat.titulo(conversacion)
    FilaDeLista(
        titulo,
        Modifier.fillMaxWidth(),
        secundario = conversacion.vistaPrevia?.takeIf { it.isNotEmpty() } ?: "Sin mensajes aún",
        inicio = {
            val url = conversacion.contraparte?.takeIf { conversacion.tipo == "directa" }?.imagen?.let(avatar)
            Avatar(42.dp, url = url, nombre = titulo, conBorde = false)
        },
        borde = true,
        lineasDelTitulo = 2,
        alPulsar = alPulsar,
    ) {
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(Espacios.e1)) {
            val fecha = FechasDeClubes.diaYHora(conversacion.fechaUltimoMensaje)
            if (fecha.isNotEmpty()) Text(fecha, color = colores.tintaSuave, style = Textos.nota)
            if (conversacion.noLeidos > 0) {
                Text(
                    if (conversacion.noLeidos > 99) "99+" else "${conversacion.noLeidos}",
                    Modifier.widthIn(min = 24.dp).clip(RoundedCornerShape(50)).background(colores.primario).padding(5.dp)
                        .semantics { contentDescription = "${conversacion.noLeidos} sin leer" },
                    color = colores.sobrePrimario,
                    style = Textos.cuerpo.copy(fontSize = rem(0.65), fontWeight = FontWeight.Bold, lineHeight = rem(0.65)),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
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
