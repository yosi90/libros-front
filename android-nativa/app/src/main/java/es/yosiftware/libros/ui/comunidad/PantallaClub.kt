package es.yosiftware.libros.ui.comunidad

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.annotation.DrawableRes
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.datos.modelos.DetalleDeClub
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.DialogoDeConfirmacion
import es.yosiftware.libros.ui.componentes.DialogoModal
import es.yosiftware.libros.ui.componentes.Superficie
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.estadisticas.FilasDeEstadistica
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

// El detalle del club en la APK: src/app/components/mobile/social/mobile-club-detail-view/, con el Sass de la APK de
// Capacitor (5dc3120). Las secciones son tarjetas plegables (`<details>`), la de Lecturas abierta al entrar.

/** Lo que el detalle necesita de fuera: volver, la web social (los dos pasos), el chat y el avatar de una persona. */
class AccionesDelClub(
    val volver: () -> Unit,
    val abrirWebSocial: (String) -> Unit,
    /** «Abrir chat»: la conversación del club en el chat de la plataforma (hito 12). */
    val abrirChat: (Long) -> Unit,
    /** La miniatura de una persona de la plataforma, completa (la ruta es relativa a su API). */
    val avatar: (String?) -> String?,
)

@Composable
fun PantallaClub(vm: ClubViewModel, acciones: AccionesDelClub) {
    val ancha = LocalVentana.current.anchoDp >= 600
    LaunchedEffect(vm.id) { if (vm.club == null && vm.eliminado == null) vm.recargar() }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if (ancha) Espacios.e4 else Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e4),
    ) {
        Volver(acciones.volver)
        when {
            vm.cargando -> EstadoDePantalla(Iconos.hourglassTop, "Cargando club…", tamanoIcono = 52, alturaMinima = 280)
            vm.error.isNotEmpty() -> EstadoDePantalla(
                Iconos.cloudOff, vm.error, titulo = "No pudimos abrir el club", error = true, tamanoIcono = 52, alturaMinima = 280,
                boton = "Reintentar" to { vm.recargar() },
            )
        }
        vm.eliminado?.let { nombre -> Eliminado(vm, nombre) }
        when (vm.espera) {
            EsperaAlFeed.ESPERANDO -> Mensaje("Ya estás dentro en Yosiftware. Libros tarda unos segundos (a veces unos minutos) en abrirte el club: lo seguimos comprobando.")
            EsperaAlFeed.AGOTADA -> Mensaje("Libros todavía no ha recibido tu entrada en el club. Puede tardar unos minutos más.", accion = "Comprobar de nuevo" to vm::empezarEspera)
            EsperaAlFeed.NADA -> Unit
        }
        val club = vm.club
        if (!vm.cargando && club != null) {
            Cabecera(vm, club, acciones, ancha)
            if (vm.mensajeDeAccion.isNotEmpty()) {
                Mensaje(vm.mensajeDeAccion, accion = if (vm.ayudaDosPasos) "Activar la verificación en dos pasos" to { acciones.abrirWebSocial(MensajesDeEspacios.VISTA_DE_SEGURIDAD) } else null)
            }
            if (vm.necesitaDosPasos) {
                Mensaje("El club exige la verificación en dos pasos: hasta que la actives, tu acceso está en pausa.", error = true,
                    accion = "Activarla" to { acciones.abrirWebSocial(MensajesDeEspacios.VISTA_DE_SEGURIDAD) })
            }
            if (vm.errorDeSeccion.isNotEmpty()) Mensaje(vm.errorDeSeccion, error = true, accion = "Reintentar" to { vm.recargar() })
            Metricas(club)
            if (vm.abierto) {
                Tarjeta(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        Icon(painterResource(Iconos.personSearch), contentDescription = null, tint = LocalColores.current.primario)
                        Text("Autores más leídos", color = LocalColores.current.tinta, style = Textos.filaPrincipal)
                    }
                    Box(Modifier.padding(top = Espacios.e3)) {
                        FilasDeEstadistica(vm.autores, ordenadas = true, vacio = "Aún no hay datos suficientes: hacen falta tres lectores del club que compartan sus estadísticas.")
                    }
                }
            }
            SeccionesDelClub(vm, club, acciones, ancha)
        }
    }
    vm.confirmacion?.let { DialogoDeConfirmacion(it.texto, vm::cancelarConfirmacion, vm::aceptarConfirmacion) }
    vm.denuncia?.let { DialogoDeDenuncia(vm) }
    if (vm.hojaDeSolicitud) DialogoDeSolicitud(vm)
}

/** `.m-club-detail__back`: la flecha y «Clubes», que vuelve a la lista de clubes (la web decía «Comunidad» e iba al Resumen). */
@Composable
private fun Volver(alVolver: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.heightIn(min = 48.dp).clip(RoundedCornerShape(Radios.sm)).clickable(role = Role.Button, onClick = alVolver).padding(end = Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        Icon(painterResource(Iconos.arrowBack), contentDescription = null, tint = colores.primario)
        Text("Clubes", color = colores.primario, style = Textos.cuerpo.copy(fontWeight = FontWeight.ExtraBold))
    }
}

/** `.m-club-detail__message`: en el contenedor primario o, si es un error, en el de error; con su acción subrayada. */
@Composable
private fun Mensaje(texto: String, error: Boolean = false, accion: Pair<String, () -> Unit>? = null) {
    val colores = LocalColores.current
    val tinta = if (error) colores.error else colores.sobreContenedorPrimario
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(if (error) colores.contenedorError else colores.contenedorPrimario)
            .padding(horizontal = Espacios.e4, vertical = Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e1),
    ) {
        Text(texto, color = tinta, style = Textos.cuerpo)
        accion?.let { (etiqueta, accionar) ->
            Text(
                etiqueta, Modifier.clickable(role = Role.Button, onClick = accionar).padding(vertical = Espacios.e1),
                color = tinta, style = Textos.cuerpo.copy(fontWeight = FontWeight.ExtraBold, textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline),
            )
        }
    }
}

@Composable
private fun Eliminado(vm: ClubViewModel, nombre: String) {
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Icon(painterResource(Iconos.inventory2), contentDescription = null, tint = LocalColores.current.primario, modifier = Modifier.size(48.dp))
            TextoTitulo("$nombre está eliminado")
            Text("El histórico y los miembros se conservan, pero el acceso y el chat permanecen revocados.", color = LocalColores.current.tintaSuave, style = Textos.cuerpo)
            Boton(if (vm.restaurando) "Restaurando…" else "Restaurar club", vm::restaurar, habilitado = !vm.restaurando)
            if (vm.mensajeDeAccion.isNotEmpty()) Mensaje(vm.mensajeDeAccion)
        }
    }
}

/** `.m-club-detail__hero`: el nombre, la descripción y las acciones de pertenencia. */
@Composable
private fun Cabecera(vm: ClubViewModel, club: DetalleDeClub, acciones: AccionesDelClub, ancha: Boolean) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
            Column {
                TextoEyebrow("Club de lectura · ${EtiquetasDeClubes.visibilidad(club.visibilidad)}")
                TextoTitulo(club.nombre)
                // La descripción, como texto: los saltos de línea se conservan (la web los perdía).
                Text(
                    club.descripcionMarkdown?.takeIf { it.isNotBlank() } ?: "Este club aún no ha añadido una descripción.",
                    Modifier.padding(top = Espacios.e3), color = colores.tintaSuave, style = Textos.apoyo,
                )
            }
            val botones: @Composable (Modifier) -> Unit = { ancho ->
                if (vm.puedeUnirse && vm.solicitudPropia) {
                    Row(ancho.heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally)) {
                        Icon(painterResource(Iconos.scheduleSend), contentDescription = null, tint = colores.primario)
                        Text("Solicitud enviada", color = colores.primario, style = Textos.filaPrincipal)
                    }
                    Boton(if (vm.retirandoSolicitud) "Retirando…" else "Retirar solicitud", vm::retirarSolicitud, ancho, variante = VarianteDeBoton.Contorno, habilitado = !vm.retirandoSolicitud)
                } else if (vm.puedeUnirse) {
                    Boton(
                        when {
                            vm.uniendose -> "Enviando…"
                            vm.abierto -> "Unirme"
                            else -> "Solicitar acceso"
                        },
                        vm::unirseOSolicitar, ancho, icono = if (vm.abierto) Iconos.groupAdd else Iconos.markEmailUnread, habilitado = !vm.uniendose,
                    )
                }
                if (vm.esMiembro) {
                    Boton("Abrir chat", { club.conversacionId?.let(acciones.abrirChat) }, ancho, icono = Iconos.forum, habilitado = vm.chatDisponible)
                }
                if (!vm.esPropietario) {
                    BotonDePeligro(if (vm.denunciandoClub) "Enviando…" else "Denunciar", vm::denunciarClub, ancho, icono = Iconos.flag, habilitado = !vm.denunciandoClub)
                }
            }
            if (ancha) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) { botones(Modifier) }
            } else {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) { botones(Modifier.fillMaxWidth()) }
            }
        }
    }
}

/** `.m-button--outline.is-danger`. */
@Composable
private fun BotonDePeligro(texto: String, alPulsar: () -> Unit, modifier: Modifier = Modifier, @DrawableRes icono: Int? = null, habilitado: Boolean = true) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(50)
    Row(
        modifier.heightIn(min = 48.dp).alpha(if (habilitado) 1f else 0.6f).clip(forma).border(1.dp, colores.contorno, forma)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar).padding(horizontal = 21.dp, vertical = 11.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icono != null) Icon(painterResource(icono), contentDescription = null, tint = colores.error)
        Text(texto, color = colores.error, style = Textos.boton)
    }
}

/**
 * `.m-club-detail__metrics`: Miembros y Publicaciones, en dos columnas (la web dejaba la rejilla de tres de cuando
 * había «Mensajes»: un hueco a la derecha).
 */
@Composable
private fun Metricas(club: DetalleDeClub) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        listOf(Triple(Iconos.groups, club.miembrosActivos, "Miembros"), Triple(Iconos.article, club.publicaciones, "Publicaciones")).forEach { (icono, valor, etiqueta) ->
            Column(
                Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(Radios.sm)).background(colores.contenedorPrimario).padding(Espacios.e3),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Icon(painterResource(icono), contentDescription = null, tint = colores.primario)
                Text("$valor", color = colores.tinta, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold, fontSize = rem(1.35), lineHeight = rem(1.35)))
                Text(etiqueta, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.68)), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

// --- Secciones. ---

@Composable
private fun SeccionesDelClub(vm: ClubViewModel, club: DetalleDeClub, acciones: AccionesDelClub, ancha: Boolean) {
    SeccionPlegable(Iconos.collectionsBookmark, "Lecturas", "Actual e histórico", abiertaAlEntrar = true) { Lecturas(vm, ancha) }
    if (vm.lecturas.isNotEmpty() && vm.esMiembro) SeccionPlegable(Iconos.bookmarkAdded, "Mi progreso", "Lectura personal") { MiProgreso(vm, ancha) }
    SeccionPlegable(Iconos.flag, "Hitos", "Ritmo de lectura") { Hitos(vm, ancha) }
    SeccionPlegable(Iconos.calendarMonth, "Calendario", "Próximos encuentros") { Calendario(vm, ancha) }
    if (vm.esMiembro) {
        SeccionPlegable(Iconos.chat, "Chat", "Conversación del club") {
            if (vm.chatDisponible) {
                Boton("Abrir el chat del club", { club.conversacionId?.let(acciones.abrirChat) }, icono = Iconos.forum)
            } else {
                Vacio(vm.motivoSinChat)
            }
        }
        SeccionPlegable(Iconos.article, "Publicaciones", "Lo que comparten los miembros") { Publicaciones(vm) }
    }
    SeccionPlegable(Iconos.forum, "Debates", "Conversaciones persistentes") { Debates(vm, ancha) }
    SeccionPlegable(Iconos.poll, "Encuestas", "Decisiones compartidas") { Encuestas(vm) }
    SeccionPlegable(Iconos.groups, "Miembros", "Personas que leen juntas") { Miembros(vm, club, acciones, ancha) }
}

/** `.m-club-section`: la cabecera con el icono, el título, el subtítulo y la flecha; el cuerpo, al abrirla. */
@Composable
private fun SeccionPlegable(@DrawableRes icono: Int, titulo: String, subtitulo: String, abiertaAlEntrar: Boolean = false, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    var abierta by rememberSaveable(titulo) { mutableStateOf(abiertaAlEntrar) }
    val giro by animateFloatAsState(if (abierta) 180f else 0f, label = "flecha")
    Superficie(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 76.dp).clickable(role = Role.Button) { abierta = !abierta }
                .then(if (abierta) Modifier.drawBehind { drawLine(colores.contorno, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx()) } else Modifier)
                .padding(Espacios.e4),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        ) {
            Box(Modifier.size(42.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
                Icon(painterResource(icono), contentDescription = null, tint = colores.primario)
            }
            Column(Modifier.weight(1f)) {
                Text(titulo, Modifier.semantics { heading() }, color = colores.tinta, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold, fontSize = rem(1.05), lineHeight = rem(1.26)))
                Text(subtitulo, Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
            }
            Icon(painterResource(Iconos.expandMore), contentDescription = if (abierta) "Plegar" else "Desplegar", tint = colores.tintaSuave, modifier = Modifier.rotate(giro))
        }
        if (abierta) {
            Column(Modifier.fillMaxWidth().padding(Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e3), content = contenido)
        }
    }
}

/** `.m-club-row`: el icono, el título, la línea pequeña, el párrafo y, si hay, una acción. */
@Composable
private fun FilaDeClub(@DrawableRes icono: Int, titulo: String, pequena: String?, parrafo: String? = null, accion: (@Composable () -> Unit)? = null) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.superficieContenedor).padding(Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.width(30.dp))
        Column(Modifier.weight(1f)) {
            Text(titulo, color = colores.tinta, style = Textos.filaPrincipal)
            if (!pequena.isNullOrEmpty()) Text(pequena, Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
            if (!parrafo.isNullOrEmpty()) Text(parrafo, Modifier.padding(top = Espacios.e2), color = colores.tintaSuave, style = Textos.cuerpo)
        }
        accion?.invoke()
    }
}

@Composable
private fun Vacio(texto: String) {
    Text(texto, color = LocalColores.current.tintaSuave, style = Textos.cuerpo)
}

@Composable
private fun ErrorEnSeccion(texto: String) {
    if (texto.isNotEmpty()) Text(texto, color = LocalColores.current.error, style = Textos.cuerpo)
}

/** `.m-club-form`: separado por una raya, con 12 dp entre campos y el botón a la derecha. */
@Composable
private fun Formulario(contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth().drawBehind { drawLine(colores.contorno, Offset(0f, 0f), Offset(size.width, 0f), 1.dp.toPx()) }.padding(top = Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e3),
        content = contenido,
    )
}

/** `.m-club-form__columns`: dos columnas desde 600 dp; una en el móvil. */
@Composable
private fun Columnas(ancha: Boolean, contenido: @Composable (Modifier) -> Unit) {
    if (ancha) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) { contenido(Modifier.weight(1f)) }
    } else {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) { contenido(Modifier.fillMaxWidth()) }
    }
}

private val formatoDeFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

/**
 * El `datetime-local` de la web: el campo con la fecha y la hora, que abre los selectores del sistema (los mismos que
 * abría la WebView). Con valor, la X lo vacía.
 */
@Composable
private fun CampoDeFechaYHora(etiqueta: String, valor: LocalDateTime?, alCambiar: (LocalDateTime?) -> Unit, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(etiqueta, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.ExtraBold))
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contornoFuerte, forma)
                .clickable(role = Role.Button) {
                    val base = valor ?: LocalDateTime.now().withSecond(0).withNano(0)
                    DatePickerDialog(contexto, { _, anio, mes, dia ->
                        TimePickerDialog(contexto, { _, hora, minuto ->
                            alCambiar(LocalDateTime.of(anio, mes + 1, dia, hora, minuto))
                        }, base.hour, base.minute, true).show()
                    }, base.year, base.monthValue - 1, base.dayOfMonth).show()
                }
                .padding(start = Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(valor?.format(formatoDeFecha) ?: "dd/mm/aaaa, --:--", Modifier.weight(1f), color = if (valor == null) colores.tintaSuave else colores.tinta, style = Textos.cuerpo)
            if (valor != null) BotonDeIcono(Iconos.close, "Quitar $etiqueta", { alCambiar(null) }, color = colores.tintaSuave)
            else Icon(painterResource(Iconos.calendarToday), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.padding(end = Espacios.e3))
        }
    }
}

/** Un selector con «ninguno» delante (`[ngValue]="null"`). */
@Composable
private fun SelectorConNinguno(ninguno: String, opciones: List<Pair<Int, String>>, elegida: Int?, alElegir: (Int?) -> Unit, modifier: Modifier = Modifier) {
    SelectorDeFormulario(listOf<Pair<Int?, String>>(null to ninguno) + opciones, elegida, alElegir, modifier)
}

@Composable
private fun Lecturas(vm: ClubViewModel, ancha: Boolean) {
    if (vm.cargandoLecturas) Vacio("Cargando lecturas…")
    vm.lecturas.forEach { lectura ->
        val desde = lectura.fechaInicio?.let { " · Desde ${FechasDeClubes.dia(it)}" }.orEmpty()
        FilaDeClub(if (lectura.activa) Iconos.menuBook else Iconos.history, vm.etiquetaDeLectura(lectura), (if (lectura.activa) "Lectura actual" else "Lectura cerrada") + desde)
    }
    if (!vm.cargandoLecturas && vm.lecturas.isEmpty()) Vacio("El histórico está disponible al formar parte del club.")
    if (vm.puedeGestionar) {
        Formulario {
            SelectorDeFormulario(listOf("libro" to "Libro", "saga" to "Saga", "universo" to "Universo", "antologia" to "Antología"), vm.tipoDeObjetivo, vm::elegirTipoDeObjetivo)
            val obras = vm.obrasDelTipo
            SelectorConNinguno("Elige una obra de tu colección", obras, vm.objetivoId, vm::elegirObjetivo)
            CampoDeFormulario(vm.notaDeLectura, vm::escribirNota, "Nota visible opcional", maximo = 1000)
            Columnas(ancha) { modifier ->
                CampoDeFechaYHora("Inicio", vm.inicioDeLectura, vm::elegirInicioDeLectura, modifier)
                CampoDeFechaYHora("Final", vm.finDeLectura, vm::elegirFinDeLectura, modifier)
            }
            Boton(
                if (vm.guardandoLectura) "Actualizando…" else "Establecer lectura actual", vm::establecerLectura, Modifier.align(Alignment.End),
                habilitado = vm.objetivoId != null && !vm.guardandoLectura && vm.objetivoDisponible,
            )
            if (obras.isEmpty()) Vacio("No tienes obras de este tipo en tu colección.")
            ErrorEnSeccion(vm.errorDeLectura)
        }
    }
}

@Composable
private fun MiProgreso(vm: ClubViewModel, ancha: Boolean) {
    val colores = LocalColores.current
    SelectorConNinguno("Selecciona una lectura", vm.lecturas.map { it.id to vm.etiquetaDeLectura(it) }, vm.lecturaDelProgreso, vm::elegirLecturaDelProgreso)
    Columnas(ancha) { modifier ->
        CampoDeFormulario(vm.pagina, vm::escribirPagina, "Página actual", modifier, numerico = true)
        CampoDeFormulario(vm.capitulo, vm::escribirCapitulo, "Capítulo actual", modifier)
    }
    Row(
        Modifier.heightIn(min = 48.dp).clickable(role = Role.Checkbox) { vm.alternarCompartir(!vm.compartir) },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        Checkbox(vm.compartir, vm::alternarCompartir, colors = CheckboxDefaults.colors(checkedColor = colores.primario))
        Text("Compartir este progreso con el club", color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.ExtraBold))
    }
    Boton(
        if (vm.guardandoProgreso) "Guardando…" else "Guardar progreso", vm::guardarProgreso,
        habilitado = vm.lecturaDelProgreso != null && !vm.guardandoProgreso,
    )
    ErrorEnSeccion(vm.errorDeProgreso)
}

@Composable
private fun Hitos(vm: ClubViewModel, ancha: Boolean) {
    vm.hitos.forEach { hito ->
        val fecha = hito.fechaOrientativa?.let { " · ${FechasDeClubes.completa(it)}" }.orEmpty()
        FilaDeClub(if (hito.tipo == "evento") Iconos.event else Iconos.bookmark, hito.titulo, EtiquetasDeClubes.tipoDeHito(hito.tipo) + fecha, hito.objetivoTexto)
    }
    if (vm.hitos.isEmpty()) Vacio("No hay hitos programados todavía.")
    if (vm.puedeGestionar) {
        Formulario {
            CampoDeFormulario(vm.tituloDeHito, vm::escribirTituloDeHito, "Título del hito", maximo = 200)
            Columnas(ancha) { modifier ->
                SelectorDeFormulario(listOf("pagina" to "Página", "capitulo" to "Capítulo", "evento" to "Evento"), vm.tipoDeHito, vm::elegirTipoDeHito, modifier)
                SelectorConNinguno("Sin lectura vinculada", vm.lecturas.map { it.id to vm.etiquetaDeLectura(it) }, vm.lecturaDelHito, vm::elegirLecturaDelHito, modifier)
            }
            Columnas(ancha) { modifier ->
                CampoDeFormulario(vm.referenciaInicio, vm::escribirReferenciaInicio, "Referencia inicial", modifier, numerico = true)
                CampoDeFormulario(vm.referenciaFin, vm::escribirReferenciaFin, "Referencia final", modifier, numerico = true)
            }
            CampoDeFechaYHora("Fecha orientativa", vm.fechaDelHito, vm::elegirFechaDelHito)
            CampoDeFormulario(vm.objetivoDelHito, vm::escribirObjetivoDelHito, "Objetivo opcional")
            Boton(if (vm.creandoHito) "Creando…" else "Crear hito", vm::crearHito, Modifier.align(Alignment.End), habilitado = vm.tituloDeHito.isNotBlank() && !vm.creandoHito)
            ErrorEnSeccion(vm.errorDeHito)
        }
    }
}

@Composable
private fun Calendario(vm: ClubViewModel, ancha: Boolean) {
    vm.eventos.forEach { evento ->
        val hasta = evento.fechaFin?.let { " · hasta ${FechasDeClubes.completa(it)}" }.orEmpty()
        FilaDeClub(Iconos.event, evento.titulo, FechasDeClubes.completa(evento.fechaInicio) + hasta, evento.descripcionMarkdown,
            accion = if (vm.puedeGestionar) ({ BotonDeIcono(Iconos.deleteOutline, "Eliminar evento", { vm.borrarEvento(evento) }, color = LocalColores.current.error) }) else null)
    }
    if (vm.eventos.isEmpty()) Vacio("No hay eventos programados.")
    if (vm.puedeGestionar) {
        Formulario {
            CampoDeFormulario(vm.tituloDeEvento, vm::escribirTituloDeEvento, "Título del evento", maximo = 200)
            Columnas(ancha) { modifier ->
                CampoDeFechaYHora("Inicio", vm.inicioDeEvento, vm::elegirInicioDeEvento, modifier)
                CampoDeFechaYHora("Final", vm.finDeEvento, vm::elegirFinDeEvento, modifier)
            }
            SelectorConNinguno("Sin hito vinculado", vm.hitos.map { it.id to it.titulo }, vm.hitoDelEvento, vm::elegirHitoDelEvento)
            CampoDeFormulario(vm.descripcionDelEvento, vm::escribirDescripcionDelEvento, "Descripción opcional")
            Boton(
                if (vm.guardandoEvento) "Creando…" else "Añadir evento", vm::crearEvento, Modifier.align(Alignment.End),
                habilitado = vm.tituloDeEvento.isNotBlank() && vm.inicioDeEvento != null && !vm.guardandoEvento,
            )
        }
    }
    ErrorEnSeccion(vm.errorDeCalendario)
}

@Composable
private fun ColumnScope.Publicaciones(vm: ClubViewModel) {
    vm.publicaciones.forEach { publicacion ->
        FilaDeClub(
            Iconos.article, publicacion.titulo?.takeIf { it.isNotBlank() } ?: "Publicación",
            "${publicacion.autor.nombre} · ${FechasDeClubes.completa(publicacion.fechaCreacion)}",
            publicacion.contenidoMarkdown ?: "Contenido oculto por spoiler.",
            accion = if (vm.puedeDenunciar(publicacion)) ({
                BotonDeIcono(Iconos.flag, "Denunciar publicación", { vm.denunciarPublicacion(publicacion) }, habilitado = publicacion.id !in vm.denunciandoPublicaciones)
            }) else null,
        )
    }
    if (vm.publicaciones.isEmpty() && !vm.cargandoPublicaciones) Vacio("No hay publicaciones todavía.")
    if (vm.siguientesPublicaciones != null) Boton("Cargar más", { vm.cargarPublicaciones() }, variante = VarianteDeBoton.Contorno, habilitado = !vm.cargandoPublicaciones)
    ErrorEnSeccion(vm.errorDePublicaciones)
}

@Composable
private fun ColumnScope.Debates(vm: ClubViewModel, ancha: Boolean) {
    val colores = LocalColores.current
    if (!vm.revelarSpoilers && vm.esMiembro) Boton("Revelar spoilers", vm::revelar, variante = VarianteDeBoton.Contorno, icono = Iconos.visibility)
    vm.debates.forEach { debate ->
        val forma = RoundedCornerShape(Radios.sm)
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma)
                .clickable(role = Role.Button) { vm.abrirDebate(debate) }.padding(Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        ) {
            Column(Modifier.weight(1f)) {
                Text(debate.titulo, color = colores.tinta, style = Textos.filaPrincipal)
                Text("${debate.autor.nombre} · ${FechasDeClubes.completa(debate.fechaCreacion)}", Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (debate.spoiler.oculto) {
                Text("Spoiler", Modifier.clip(RoundedCornerShape(50)).background(colores.contenedorAtencion).padding(horizontal = Espacios.e2, vertical = Espacios.e1),
                    color = colores.atencion, style = Textos.cuerpo.copy(fontSize = rem(0.65)))
            }
            Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tintaSuave)
        }
    }
    if (vm.debates.isEmpty()) Vacio("No hay debates todavía.")
    if (vm.esMiembro) {
        Formulario {
            CampoDeFormulario(vm.tituloDeDebate, vm::escribirTituloDeDebate, "Título", maximo = 200)
            CampoDeFormulario(vm.contenidoDeDebate, vm::escribirContenidoDeDebate, "Contenido", lineas = 5, maximo = 20000)
            SelectorConNinguno("Sin lectura vinculada", vm.lecturas.map { it.id to vm.etiquetaDeLectura(it) }, vm.lecturaDelDebate, vm::elegirLecturaDelDebate)
            Columnas(ancha) { modifier ->
                CampoDeFormulario(vm.spoilerInicio, vm::escribirSpoilerInicio, "Spoiler inicial", modifier, numerico = true)
                CampoDeFormulario(vm.spoilerFin, vm::escribirSpoilerFin, "Spoiler final", modifier, numerico = true)
            }
            Boton(
                if (vm.creandoDebate) "Creando…" else "Crear debate", vm::crearDebate, Modifier.align(Alignment.End),
                habilitado = vm.tituloDeDebate.isNotBlank() && vm.contenidoDeDebate.isNotBlank() && !vm.creandoDebate,
            )
        }
    }
    vm.debateAbierto?.let { detalle ->
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.superficieContenedor).padding(Espacios.e3),
            verticalArrangement = Arrangement.spacedBy(Espacios.e3),
        ) {
            Text(detalle.debate.titulo, color = colores.tinta, style = Textos.filaPrincipal.copy(fontFamily = Fuentes.display))
            Text(detalle.debate.autor.nombre, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
            Text(detalle.debate.contenidoMarkdown ?: "Contenido oculto por spoiler.", color = colores.tinta, style = Textos.cuerpo)
            detalle.comentarios.forEach { comentario ->
                Column(
                    Modifier.fillMaxWidth().drawBehind { drawLine(colores.contorno, Offset(0f, 0f), Offset(0f, size.height), 3.dp.toPx()) }.padding(start = Espacios.e3),
                ) {
                    Text(comentario.autor.nombre, color = colores.primario, style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.ExtraBold))
                    Text(comentario.contenidoMarkdown ?: "Comentario oculto por spoiler.", color = colores.tinta, style = Textos.cuerpo)
                }
            }
            if (vm.esMiembro) {
                CampoDeFormulario(vm.comentario, vm::escribirComentario, "Responder al debate", lineas = 3, maximo = 4000)
                Boton(if (vm.comentando) "Enviando…" else "Comentar", vm::comentar, Modifier.align(Alignment.End), habilitado = vm.comentario.isNotBlank() && !vm.comentando)
            }
        }
    }
    ErrorEnSeccion(vm.errorDeDebate)
}

@Composable
private fun ColumnScope.Encuestas(vm: ClubViewModel) {
    val colores = LocalColores.current
    vm.encuestas.forEach { encuesta ->
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.superficieContenedor).padding(Espacios.e3),
            verticalArrangement = Arrangement.spacedBy(Espacios.e3),
        ) {
            Text(encuesta.pregunta, color = colores.tinta, style = Textos.filaPrincipal)
            Text("${if (encuesta.cerrada) "Cerrada" else "Cierra"} · ${FechasDeClubes.completa(encuesta.fechaCierre)}", color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
            encuesta.opciones.forEach { opcion ->
                val elegida = encuesta.miVotoId == opcion.id
                val forma = RoundedCornerShape(Radios.sm)
                val habilitada = !encuesta.cerrada && encuesta.id !in vm.votando && vm.esMiembro
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(forma)
                        .background(if (elegida) colores.contenedorPrimario else colores.superficie)
                        .border(1.dp, if (elegida) colores.primario else colores.contorno, forma)
                        .clickable(enabled = habilitada, role = Role.RadioButton) { vm.votar(encuesta, opcion.id) }
                        .padding(Espacios.e3),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                ) {
                    Text(opcion.texto, Modifier.weight(1f), color = colores.tinta, style = Textos.cuerpo)
                    opcion.totalVotos?.let { Text(EtiquetasDeClubes.votos(it), color = colores.tinta, style = Textos.filaPrincipal) }
                }
            }
        }
    }
    if (vm.encuestas.isEmpty()) Vacio("No hay encuestas todavía.")
    if (vm.puedeGestionar) {
        Formulario {
            CampoDeFormulario(vm.pregunta, vm::escribirPregunta, "Pregunta", maximo = 500)
            CampoDeFormulario(vm.opciones, vm::escribirOpciones, "Una opción por línea (2–10)", lineas = 4)
            CampoDeFechaYHora("Fecha de cierre", vm.cierre, vm::elegirCierre)
            Boton(
                if (vm.creandoEncuesta) "Creando…" else "Crear encuesta", vm::crearEncuesta, Modifier.align(Alignment.End),
                habilitado = vm.pregunta.isNotBlank() && vm.cierre != null && !vm.creandoEncuesta,
            )
        }
    }
    ErrorEnSeccion(vm.errorDeEncuesta)
}

@Composable
private fun ColumnScope.Miembros(vm: ClubViewModel, club: DetalleDeClub, acciones: AccionesDelClub, ancha: Boolean) {
    val colores = LocalColores.current
    if (vm.esMiembro && !vm.esPropietario) BotonDePeligro(if (vm.saliendo) "Saliendo…" else "Abandonar club", vm::salir, habilitado = !vm.saliendo)
    if (vm.esPropietario) BotonDePeligro(if (vm.eliminando) "Eliminando…" else "Eliminar club", vm::eliminar, habilitado = !vm.eliminando)
    if (vm.puedeInvitar) {
        FilaConBoton(ancha) { modifier ->
            CampoDeFormulario(vm.busquedaDePersonas, vm::escribirBusquedaDePersonas, "Buscar una persona de Yosiftware", modifier, maximo = 60, alEnviar = vm::buscarPersonas)
            Boton(if (vm.buscandoPersonas) "Buscando…" else "Buscar", vm::buscarPersonas, habilitado = !vm.buscandoPersonas)
        }
        if (vm.puedeElegirRol) {
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("Invitar como", color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.75), fontWeight = FontWeight.ExtraBold))
                SelectorDeFormulario(listOf("miembro" to "Miembro", "moderacion" to "Moderación"), vm.rolDeInvitacion, vm::elegirRolDeInvitacion)
            }
        }
        vm.personas.forEach { persona ->
            val clave = "cuenta:${persona.id}"
            FilaDePersona(persona.visible, "@${persona.alias}", acciones.avatar(persona.avatar)) {
                Boton(if (clave in vm.invitando) "Enviando…" else "Invitar", { vm.invitarPersona(persona) }, variante = VarianteDeBoton.Tonal, habilitado = clave !in vm.invitando)
            }
        }
        if (vm.personasBuscadas && !vm.buscandoPersonas && vm.personas.isEmpty()) Vacio("No hay personas con ese nombre o alias.")
        FilaConBoton(ancha) { modifier ->
            CampoDeFormulario(vm.correo, vm::escribirCorreo, "O invita a un correo", modifier, correo = true, maximo = 254, alEnviar = vm::invitarCorreo)
            Boton("Invitar", vm::invitarCorreo, variante = VarianteDeBoton.Tonal, habilitado = vm.invitando.isEmpty())
        }
        if (vm.invitacionesEnviadas.isNotEmpty()) {
            BloqueDePendientes("Invitaciones pendientes") {
                vm.invitacionesEnviadas.forEach { invitacion ->
                    Pendiente(vm.destinoDe(invitacion), invitacion.caduca?.let { "Caduca el ${FechasDeClubes.dia(it)}" }, ancha) {
                        Boton("Retirar", { vm.retirarInvitacion(invitacion) }, variante = VarianteDeBoton.Contorno, habilitado = invitacion.id !in vm.retirandoInvitaciones)
                    }
                }
            }
        }
    }
    if (vm.solicitudes.isNotEmpty()) {
        BloqueDePendientes("Solicitudes pendientes") {
            vm.solicitudes.forEach { solicitud ->
                val ocupada = solicitud.id in vm.resolviendoSolicitudes
                Pendiente(solicitud.visible, solicitud.mensaje, ancha) {
                    Boton("Aprobar", { vm.resolverSolicitud(solicitud, aprobar = true) }, variante = VarianteDeBoton.Tonal, habilitado = !ocupada)
                    Boton("Rechazar", { vm.resolverSolicitud(solicitud, aprobar = false) }, variante = VarianteDeBoton.Contorno, habilitado = !ocupada)
                }
            }
        }
    }
    ErrorEnSeccion(vm.errorDeMiembros)
    club.miembros.forEach { miembro ->
        FilaDePersona(miembro.nombre, EtiquetasDeClubes.rol(miembro.rol), null) {
            if (vm.esPropietario && miembro.rol != "propietario") {
                val ocupado = miembro.id in vm.enCursoMiembros
                BotonDeIcono(
                    if (miembro.rol == "moderador") Iconos.person else Iconos.adminPanelSettings,
                    if (miembro.rol == "moderador") "Quitar moderación" else "Hacer moderador",
                    { vm.cambiarRol(miembro) }, habilitado = !ocupado,
                )
                BotonDeIcono(Iconos.personRemove, "Expulsar", { vm.expulsar(miembro) }, color = colores.error, habilitado = !ocupado)
            }
        }
    }
    if (club.miembros.isEmpty()) Vacio("El listado de miembros todavía está vacío.")
}

/** `.m-club-invite`: el campo y su botón, en fila desde 600 dp. */
@Composable
private fun FilaConBoton(ancha: Boolean, contenido: @Composable (Modifier) -> Unit) {
    if (ancha) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) { contenido(Modifier.weight(1f)) }
    } else {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) { contenido(Modifier.fillMaxWidth()) }
    }
}

/** Una persona en `.m-list-item` (con su foto si la tiene) y sus acciones. */
@Composable
private fun FilaDePersona(nombre: String, apoyo: String, avatar: String?, acciones: @Composable RowScope.() -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma).padding(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        if (avatar != null) {
            Avatar(42.dp, url = avatar, nombre = nombre, conBorde = false)
        } else {
            Box(Modifier.size(42.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.person), contentDescription = null, tint = colores.primario)
            }
        }
        Column(Modifier.weight(1f)) {
            Text(nombre, color = colores.tinta, style = Textos.filaPrincipal, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(apoyo, Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        acciones()
    }
}

/** `.m-club-requests`: el bloque con su título y sus filas. */
@Composable
private fun BloqueDePendientes(titulo: String, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.superficieContenedor).padding(Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Text(titulo, color = colores.tinta, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold))
        contenido()
    }
}

@Composable
private fun Pendiente(titulo: String, pequena: String?, ancha: Boolean, botones: @Composable RowScope.() -> Unit) {
    val colores = LocalColores.current
    val texto: @Composable (Modifier) -> Unit = { modifier ->
        Column(modifier) {
            Text(titulo, color = colores.tinta, style = Textos.filaPrincipal)
            if (!pequena.isNullOrEmpty()) Text(pequena, Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
        }
    }
    if (ancha) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            texto(Modifier.weight(1f))
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e1), content = botones)
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            texto(Modifier)
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e1), content = botones)
        }
    }
}

// --- Diálogos. ---

/** El `window.prompt` de la denuncia, como diálogo: el motivo (hasta 1000 caracteres). */
@Composable
private fun DialogoDeDenuncia(vm: ClubViewModel) {
    var motivo by rememberSaveable { mutableStateOf("") }
    DialogoModal(alCerrar = vm::cancelarDenuncia) {
        Text("Describe brevemente el motivo de la denuncia (máximo 1.000 caracteres).", color = LocalColores.current.tinta, style = Textos.cuerpo)
        CampoDeFormulario(motivo, { motivo = it }, "Motivo", Modifier.padding(top = Espacios.e3), lineas = 4, maximo = 1000)
        Row(Modifier.fillMaxWidth().padding(top = Espacios.e5), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
            Boton("Cancelar", vm::cancelarDenuncia, variante = VarianteDeBoton.Contorno)
            Boton("Enviar", { vm.enviarDenuncia(motivo) }, habilitado = motivo.isNotBlank())
        }
    }
}

/**
 * La solicitud de acceso a un club cerrado (`.m-club-request-dialog`). TODO(clon): en la web es una hoja inferior sobre
 * toda la pantalla; aquí, un diálogo, porque la hoja del shell no cubre la pantalla desde dentro de Comunidad.
 */
@Composable
private fun DialogoDeSolicitud(vm: ClubViewModel) {
    val colores = LocalColores.current
    DialogoModal(alCerrar = vm::cerrarHojaDeSolicitud) {
        TextoEyebrow("Club cerrado")
        TextoTitulo("Solicitar acceso a ${vm.club?.nombre.orEmpty()}")
        Text("Puedes añadir un mensaje para presentarte a quienes moderan el club.", Modifier.padding(top = Espacios.e3), color = colores.tintaSuave, style = Textos.apoyo)
        CampoDeFormulario(vm.mensajeDeSolicitud, vm::escribirMensajeDeSolicitud, "Mensaje opcional", Modifier.padding(top = Espacios.e3), lineas = 5, maximo = 500)
        Text("${vm.mensajeDeSolicitud.length} / 500", Modifier.fillMaxWidth().padding(top = Espacios.e1), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)), textAlign = TextAlign.End)
        Row(Modifier.fillMaxWidth().padding(top = Espacios.e3), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
            Boton("Cancelar", vm::cerrarHojaDeSolicitud, variante = VarianteDeBoton.Contorno)
            Boton(if (vm.uniendose) "Enviando…" else "Enviar solicitud", vm::enviarSolicitud, habilitado = !vm.uniendose)
        }
    }
}
