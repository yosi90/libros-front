package es.yosiftware.libros.ui.comunidad

import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

// La pestaña Comunidad de la APK: mobile-social-shell (la tira de secciones arriba en el móvil; el rail de 88 dp desde
// 600), con el Resumen, los Clubes y el centro de acceso de src/app/components/mobile/social/, y el Sass de la APK de
// Capacitor (5dc3120). Lo social que se fue a la plataforma se abre en la web social.

/** Lo que la pestaña Comunidad necesita de fuera: los enlaces, el chat, el panel de cuentas y el detalle de un club. */
class AccionesDeComunidad(
    /** Una vista de la web social, en el navegador (`personas`, `amistades`, `seguridad`…). */
    val abrirWebSocial: (String) -> Unit,
    /** La sección Mensajes: el chat de la plataforma ([es.yosiftware.libros.ui.mensajes.PantallaMensajes]). */
    val mensajes: @Composable () -> Unit,
    /** «Entrar con otra cuenta»: el panel de cuentas. */
    val cambiarDeCuenta: () -> Unit,
    /** Si hay obras en la colección: sin ellas no se puede crear un club. */
    val tieneObras: () -> Boolean,
    /** El detalle del club abierto. */
    val detalleDelClub: @Composable (Int) -> Unit,
    /** Una dirección en el navegador (el enlace de una novedad). */
    val abrirEnlace: (String) -> Unit = {},
    /** Una imagen de la plataforma (avatar o cabecera), completa: la ruta es relativa a su API. */
    val avatar: (String?) -> String? = { it },
    /** Al pulsar Mensajes: vuelve a la bandeja, como el enlace `messages` de la web. */
    val alElegirMensajes: () -> Unit = {},
)

@Composable
fun PantallaComunidad(
    comunidad: ComunidadViewModel,
    clubes: ClubesViewModel,
    acceso: CentroDeAccesoViewModel,
    actividad: ActividadViewModel,
    acciones: AccionesDeComunidad,
    /** Los mensajes sin leer de la bandeja del chat: la insignia de Mensajes y la tarjeta del Resumen. */
    sinLeer: Int = 0,
) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    LaunchedEffect(Unit) { comunidad.alEntrar() }
    BackHandler(enabled = comunidad.clubAbierto != null) { comunidad.cerrarClub() }
    val contenido: @Composable () -> Unit = {
        Box(Modifier.fillMaxSize()) {
            when (comunidad.seccion) {
                SeccionDeComunidad.CLUBES -> comunidad.clubAbierto?.let { acciones.detalleDelClub(it) } ?: PantallaClubes(comunidad, clubes, acceso, acciones)
                SeccionDeComunidad.ACTIVIDAD -> PantallaActividad(actividad, acciones)
                SeccionDeComunidad.MENSAJES -> acciones.mensajes()
                else -> PantallaResumen(comunidad, clubes, acceso, acciones, sinLeer)
            }
        }
    }
    if (ancha) {
        Row(Modifier.fillMaxSize().background(colores.lienzo)) {
            Column(
                Modifier.width(88.dp).fillMaxHeight().background(mezclar(colores.superficieContenedor, 0.28f))
                    .drawBehind { drawLine(mezclar(colores.contorno, 0.58f), Offset(size.width, 0f), Offset(size.width, size.height), 1.dp.toPx()) }
                    .verticalScroll(rememberScrollState()).padding(horizontal = 6.dp, vertical = Espacios.e2),
                verticalArrangement = Arrangement.spacedBy(Espacios.e1),
            ) { Secciones(comunidad, acciones, sinLeer, ancha = true) }
            Box(Modifier.weight(1f).fillMaxHeight()) { contenido() }
        }
    } else {
        Column(Modifier.fillMaxSize().background(colores.lienzo)) {
            Row(
                Modifier.fillMaxWidth().background(mezclar(colores.superficieContenedor, 0.24f))
                    .drawBehind { drawLine(mezclar(colores.contorno, 0.58f), Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx()) }
                    .horizontalScroll(rememberScrollState()).padding(horizontal = Espacios.e3, vertical = Espacios.e1),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e1),
            ) { Secciones(comunidad, acciones, sinLeer, ancha = false) }
            Box(Modifier.weight(1f)) { contenido() }
        }
    }
}

/** Las secciones propias y las de la web social (`.m-social-shell__navigation`). */
@Composable
private fun Secciones(comunidad: ComunidadViewModel, acciones: AccionesDeComunidad, sinLeer: Int, ancha: Boolean) {
    SeccionDeComunidad.entries.forEach { seccion ->
        val disponible = seccion != SeccionDeComunidad.CLUBES || comunidad.clubesDisponibles
        val insignia = if (seccion == SeccionDeComunidad.MENSAJES) sinLeer else 0
        ElementoDeSeccion(seccion.icono, seccion.etiqueta, activo = comunidad.seccion == seccion, disponible = disponible, ancha = ancha, insignia = insignia) {
            if (seccion == SeccionDeComunidad.MENSAJES) acciones.alElegirMensajes()
            comunidad.abrir(seccion)
        }
    }
    EnlaceSocial.entries.forEach { enlace ->
        ElementoDeSeccion(enlace.icono, enlace.etiqueta, activo = false, disponible = true, ancha = ancha, simbolo = true) { acciones.abrirWebSocial(enlace.vista) }
    }
}

@Composable
private fun ElementoDeSeccion(
    @DrawableRes icono: Int,
    etiqueta: String,
    activo: Boolean,
    disponible: Boolean,
    ancha: Boolean,
    simbolo: Boolean = false,
    insignia: Int = 0,
    alPulsar: () -> Unit,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(
        Modifier.then(if (ancha) Modifier.fillMaxWidth() else Modifier.widthIn(min = 72.dp)).heightIn(min = 64.dp)
            .clip(forma)
            .background(if (activo) colores.contenedorPrimario else Color.Transparent)
            .border(1.dp, if (activo) colores.contorno else Color.Transparent, forma)
            .clickable(enabled = disponible, role = Role.Tab, onClick = alPulsar)
            .then(if (disponible) Modifier else Modifier.background(Color.Transparent))
            .padding(horizontal = if (ancha) 3.dp else Espacios.e2, vertical = if (ancha) 6.dp else Espacios.e1),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically),
    ) {
        val alfa = if (disponible) 1f else 0.45f
        Box {
            Box(
                Modifier.size(if (ancha) 34.dp else 32.dp).clip(CircleShape).background(if (ancha) colores.superficieContenedor else Color.Transparent),
                contentAlignment = Alignment.Center,
            ) {
                Icon(painterResource(icono), contentDescription = null, tint = colores.primario.copy(alpha = alfa))
            }
            // `em`: la insignia de los no leídos, sobre la esquina del icono (en el Sass, `margin: -34px 0 0 34px`, o 30 en
            // compacto, desde el centro de la entrada).
            if (insignia > 0) {
                Text(
                    if (insignia > 99) "99+" else "$insignia",
                    Modifier.align(Alignment.TopEnd).offset(x = if (ancha) 14.dp else 12.dp, y = (-6).dp)
                        .widthIn(min = 20.dp).clip(RoundedCornerShape(50)).background(colores.primario).padding(horizontal = 6.dp, vertical = 4.dp),
                    color = colores.sobrePrimario,
                    style = Textos.cuerpo.copy(fontSize = rem(0.65), fontWeight = FontWeight.ExtraBold, lineHeight = rem(0.65)),
                    textAlign = TextAlign.Center,
                )
            }
            // En el rail de 88 dp, el símbolo delante de la etiqueta la cortaba («Perso…»): va sobre el icono.
            if (simbolo && ancha) {
                Box(Modifier.align(Alignment.BottomEnd).size(16.dp).clip(CircleShape).background(colores.lienzo), contentAlignment = Alignment.Center) {
                    Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(12.dp))
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            if (simbolo && !ancha) Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.tinta, modifier = Modifier.size(15.dp))
            Text(etiqueta, color = colores.tinta.copy(alpha = alfa), style = Textos.cuerpo.copy(fontSize = rem(0.82), fontWeight = FontWeight.Bold), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

// --- Resumen. ---

@Composable
private fun PantallaResumen(comunidad: ComunidadViewModel, clubes: ClubesViewModel, acceso: CentroDeAccesoViewModel, acciones: AccionesDeComunidad, sinLeer: Int) {
    val ancha = LocalVentana.current.anchoDp >= 600
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if (ancha) Espacios.e4 else Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e4),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            BotonDeIcono(Iconos.refresh, "Actualizar resumen", comunidad::cargarResumen, habilitado = !comunidad.cargandoResumen)
        }
        if (comunidad.parcial) Aviso("Parte del resumen no está disponible. El resto continúa operativo.")
        when {
            comunidad.cargandoResumen && comunidad.tarjetas.isEmpty() -> EstadoDePantalla(Iconos.hourglassTop, "Cargando tu actividad…", alturaMinima = 240)
            comunidad.errorDelResumen.isNotEmpty() -> EstadoDePantalla(
                Iconos.cloudOff, comunidad.errorDelResumen, titulo = "No pudimos cargar el resumen", error = true, alturaMinima = 240,
                boton = "Reintentar" to comunidad::cargarResumen,
            )
            else -> Rejilla(ResumenSocialDeComunidad.conMensajes(comunidad.tarjetas, sinLeer), columnas = if (ancha) 2 else 1) { tarjeta ->
                ElementoDeLista(
                    tarjeta.icono, "${tarjeta.valor}", tarjeta.etiqueta,
                    alPulsar = {
                        when (val destino = tarjeta.destino) {
                            is DestinoDeTarjeta.WebSocial -> acciones.abrirWebSocial(destino.vista)
                            is DestinoDeTarjeta.Clubes -> {
                                comunidad.abrir(SeccionDeComunidad.CLUBES)
                                clubes.elegir(destino.pestana)
                                if (destino.pestana == PestanaDeClubes.ACCESO) acceso.ir(TipoDeAcceso.INVITACIONES, DireccionDeAcceso.RECIBIDAS)
                            }
                            DestinoDeTarjeta.Mensajes -> {
                                acciones.alElegirMensajes()
                                comunidad.abrir(SeccionDeComunidad.MENSAJES)
                            }
                        }
                    },
                    iconoFinal = if (tarjeta.externa) Iconos.openInNew else Iconos.chevronRight,
                    resaltado = tarjeta.resaltada,
                    valorGrande = true,
                    simbolo = tarjeta.externa,
                )
            }
        }
    }
}

/** El aviso de que falta algo (`__notice`): en el contenedor de atención. */
@Composable
private fun Aviso(texto: String) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(Radios.sm)).background(colores.contenedorAtencion).padding(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        Icon(painterResource(Iconos.info), contentDescription = null, tint = colores.atencion)
        Text(texto, color = colores.atencion, style = Textos.cuerpo)
    }
}

/** Una rejilla de [columnas] con 8 dp entre filas y columnas, de alto igual por fila. */
@Composable
private fun <T> Rejilla(elementos: List<T>, columnas: Int, contenido: @Composable (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        elementos.chunked(columnas).forEach { fila ->
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                fila.forEach { Box(Modifier.weight(1f).fillMaxHeight()) { contenido(it) } }
                repeat(columnas - fila.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

// --- Clubes. ---

@Composable
private fun PantallaClubes(comunidad: ComunidadViewModel, clubes: ClubesViewModel, acceso: CentroDeAccesoViewModel, acciones: AccionesDeComunidad) {
    val ancha = LocalVentana.current.anchoDp >= 600
    LaunchedEffect(Unit) {
        clubes.alEntrar()
        acceso.recargar()
    }
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(if (ancha) Espacios.e4 else Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e4),
    ) {
        when {
            clubes.cargando -> EstadoDePantalla(Iconos.hourglassTop, "Cargando la comunidad…")
            clubes.falloDeCarga -> EstadoDePantalla(Iconos.cloudOff, null, titulo = "No pudimos cargar esta sección", error = true, boton = "Reintentar" to clubes::cargarDescubrir)
            else -> Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Espacios.e1)) {
                    PestanaDeClubes.entries.forEach { pestana ->
                        PestanaEnCaja(
                            pestana.icono, pestana.etiqueta,
                            activa = clubes.pestana == pestana,
                            alPulsar = { clubes.elegir(pestana) },
                            habilitada = !pestana.necesitaClubes || clubes.tieneClubes,
                            insignia = if (pestana == PestanaDeClubes.ACCESO) acceso.pendientes else 0,
                        )
                    }
                }
                when (clubes.pestana) {
                    PestanaDeClubes.DESCUBRIR -> Descubrir(comunidad, clubes, acciones)
                    PestanaDeClubes.MIS_CLUBES -> MisClubes(comunidad, clubes)
                    PestanaDeClubes.EVENTOS -> Eventos(comunidad, clubes)
                    PestanaDeClubes.ACCESO -> CentroDeAcceso(comunidad, acceso, acciones)
                }
            }
        }
    }
}

@Composable
private fun ColumnScope.Descubrir(comunidad: ComunidadViewModel, clubes: ClubesViewModel, acciones: AccionesDeComunidad) {
    val tieneObras = acciones.tieneObras()
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        Boton(
            if (clubes.creadorAbierto) "Cerrar" else "Crear club", clubes::alternarCreador,
            icono = if (clubes.creadorAbierto) Iconos.close else Iconos.add, habilitado = tieneObras,
        )
    }
    CreacionDeClub.restriccion(tieneObras)?.let { Pista(it) }
    BarraDeBusqueda(clubes.busqueda, clubes::escribirBusqueda, "Busca un club", clubes::buscar, clubes.buscando)
    if (clubes.creadorAbierto) CreadorDeClub(clubes, tieneObras)
    if (clubes.busqueda.isEmpty() && clubes.populares.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            TituloDeLista("Clubes populares")
            clubes.populares.forEach { club ->
                ElementoDeLista(Iconos.groups, club.nombre, "${club.miembros} miembros · ${club.actividad30Dias?.total ?: 0} actividades", { comunidad.abrirClub(club.id) })
            }
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        TituloDeLista("Descubrir")
        if (clubes.descubrir.isEmpty()) Pista("No hay clubes abiertos ahora mismo.")
        clubes.descubrir.forEach { club ->
            ElementoDeLista(Iconos.groups3, club.nombre, "${club.miembros} miembros · ${EtiquetasDeClubes.membresia(club.estadoMembresia)}", { comunidad.abrirClub(club.id) })
        }
    }
    if (clubes.siguiente != null) {
        Boton("Cargar más clubes", clubes::cargarMas, Modifier.align(Alignment.CenterHorizontally), variante = VarianteDeBoton.Contorno, habilitado = !clubes.buscando)
    }
}

/** `.m-club-form`: nombre, descripción, visibilidad y «Crear club». */
@Composable
private fun CreadorDeClub(clubes: ClubesViewModel, tieneObras: Boolean) {
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            CampoDeFormulario(clubes.nombre, clubes::escribirNombre, "Nombre del club", maximo = 150)
            CampoDeFormulario(clubes.descripcion, clubes::escribirDescripcion, "Descripción opcional", lineas = 4, maximo = 20000)
            SelectorDeFormulario(listOf("abierto" to "Abierto", "cerrado" to "Cerrado"), clubes.visibilidad, clubes::elegirVisibilidad)
            if (clubes.errorDeCreacion.isNotEmpty()) Pista(clubes.errorDeCreacion, error = true)
            Boton(
                if (clubes.creando) "Creando…" else "Crear club", { clubes.crear(tieneObras) }, Modifier.align(Alignment.End),
                habilitado = CreacionDeClub.motivo(tieneObras, clubes.creando, clubes.nombre) == null,
            )
        }
    }
}

@Composable
private fun MisClubes(comunidad: ComunidadViewModel, clubes: ClubesViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        if (clubes.cargandoMisClubes && clubes.misClubes.isEmpty()) Pista("Cargando tus clubes…")
        if (!clubes.cargandoMisClubes && clubes.misClubes.isEmpty()) Pista("Aún no perteneces a ningún club.")
        clubes.misClubes.forEach { club ->
            val privado = if (club.retiradoDescubrimiento == true) " · privado" else ""
            ElementoDeLista(Iconos.groups, club.nombre, EtiquetasDeClubes.rol(club.rol) + privado, { comunidad.abrirClub(club.id) })
        }
    }
}

@Composable
private fun ColumnScope.Eventos(comunidad: ComunidadViewModel, clubes: ClubesViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        if (clubes.cargandoEventos && clubes.eventos.isEmpty()) Pista("Cargando próximos eventos…")
        if (!clubes.cargandoEventos && clubes.eventos.isEmpty()) Pista("No hay próximos eventos.")
        clubes.eventos.forEach { evento ->
            ElementoDeLista(
                if (evento.enCurso) Iconos.schedule else Iconos.event, evento.titulo,
                "${evento.club.nombre} · ${FechasDeClubes.diaYHora(evento.fechaInicio)}", { comunidad.abrirClub(evento.club.id) },
            )
        }
    }
    if (clubes.siguientesEventos != null) {
        Boton("Cargar más eventos", { clubes.cargarEventos(mas = true) }, Modifier.align(Alignment.CenterHorizontally), variante = VarianteDeBoton.Contorno, habilitado = !clubes.cargandoEventos)
    }
}

// --- Centro de acceso. ---

@Composable
private fun CentroDeAcceso(comunidad: ComunidadViewModel, acceso: CentroDeAccesoViewModel, acciones: AccionesDeComunidad) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            FiltroEnCaja("Invitaciones", acceso.tipo == TipoDeAcceso.INVITACIONES, { acceso.elegirTipo(TipoDeAcceso.INVITACIONES) }, Modifier.weight(1f),
                icono = Iconos.markEmailUnread, insignia = acceso.pendientesDe(TipoDeAcceso.INVITACIONES))
            FiltroEnCaja("Solicitudes", acceso.tipo == TipoDeAcceso.SOLICITUDES, { acceso.elegirTipo(TipoDeAcceso.SOLICITUDES) }, Modifier.weight(1f),
                icono = Iconos.forwardToInbox, insignia = acceso.pendientesDe(TipoDeAcceso.SOLICITUDES))
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                DireccionDeAcceso.entries.forEach { direccion ->
                    FiltroEnCaja(direccion.etiqueta, acceso.direccion == direccion, { acceso.elegirDireccion(direccion) }, Modifier.weight(1f),
                        insignia = acceso.pendientesDe(acceso.tipo, direccion))
                }
            }
            BotonDeIcono(Iconos.refresh, "Volver a cargar", { acceso.recargar() }, habilitado = !acceso.cargando)
        }
        if (acceso.error.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Text(acceso.error, color = colores.error, style = Textos.cuerpo)
                when (acceso.accionDelError) {
                    CentroDeAccesoViewModel.AccionDeError.CAMBIAR_DE_CUENTA -> Boton("Entrar con otra cuenta", acciones.cambiarDeCuenta, variante = VarianteDeBoton.Contorno)
                    CentroDeAccesoViewModel.AccionDeError.DOS_PASOS -> Boton("Activar la verificación en dos pasos", { acciones.abrirWebSocial(MensajesDeEspacios.VISTA_DE_SEGURIDAD) }, variante = VarianteDeBoton.Contorno, icono = Iconos.simboloYosiftware)
                    null -> Unit
                }
            }
        }
        if (acceso.aviso.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Text(acceso.aviso, color = colores.tinta, style = Textos.cuerpo)
                acceso.clubRecienEntrado?.id?.let { id -> Boton("Abrir el club", { comunidad.abrirClub(id) }) }
            }
        }
        val filas = acceso.filas
        if (acceso.cargando && filas.isEmpty()) EstadoDePantalla(Iconos.hourglassTop, "Cargando accesos…", tamanoIcono = 40, alturaMinima = 160)
        if (filas.isEmpty() && !acceso.cargando && acceso.error.isEmpty()) EstadoDePantalla(Iconos.inbox, acceso.mensajeVacio, tamanoIcono = 40, alturaMinima = 160)
        Rejilla(filas, columnas = if (ancha) 2 else 1) { fila -> TarjetaDeAcceso(comunidad, acceso, fila, ancha) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TarjetaDeAcceso(comunidad: ComunidadViewModel, acceso: CentroDeAccesoViewModel, fila: FilaDeAcceso, ancha: Boolean) {
    val colores = LocalColores.current
    val ocupada = fila.clave in acceso.enCurso || acceso.cargando
    Tarjeta(Modifier.fillMaxSize()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Box(Modifier.size(42.dp).clip(CircleShape).background(colores.contenedorPrimario), contentAlignment = Alignment.Center) {
                    Icon(painterResource(if (acceso.tipo == TipoDeAcceso.SOLICITUDES) Iconos.personAdd else Iconos.mail), contentDescription = null, tint = colores.primario)
                }
                Column(Modifier.weight(1f)) {
                    val id = fila.club.id
                    Text(
                        fila.club.nombre,
                        if (id != null) Modifier.clickable(role = Role.Button) { comunidad.abrirClub(id) } else Modifier,
                        color = if (id != null) colores.primario else colores.tinta,
                        style = Textos.cuerpo.copy(fontWeight = FontWeight.ExtraBold), maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                    Text(fila.persona, Modifier.padding(top = 3.dp), color = colores.tinta, style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.Bold), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (!ancha) Pendiente(Modifier.padding(top = Espacios.e1))
                }
                if (ancha) Pendiente()
            }
            fila.detalle?.let { Text(it, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8))) }
            fila.mensaje?.let { Text(it, color = colores.tinta, style = Textos.cuerpo) }
            val fechas = listOfNotNull(
                fila.creada?.let { "Enviada el ${FechasDeClubes.completaConPunto(it)}" },
                fila.caduca?.let { "Caduca el ${FechasDeClubes.dia(it)}" },
            ).joinToString(" · ") + if (fila.club.dosPasos) " · exige la verificación en dos pasos" else ""
            if (fechas.isNotBlank()) Text(fechas.removePrefix(" · "), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
            // Los botones saltan de línea si no caben (en la rejilla de dos columnas, «Rechazar» se partía letra a letra).
            FlowRow(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End),
                verticalArrangement = Arrangement.spacedBy(Espacios.e2),
            ) {
                val anchoBoton = if (ancha) Modifier else Modifier.weight(1f)
                if (acceso.direccion == DireccionDeAcceso.RECIBIDAS) {
                    Boton(acceso.textoDeAceptar, { acceso.aceptar(fila) }, anchoBoton, icono = Iconos.check, habilitado = !ocupada)
                    Boton("Rechazar", { acceso.rechazar(fila) }, anchoBoton, variante = VarianteDeBoton.Contorno, icono = Iconos.close, habilitado = !ocupada)
                } else {
                    Boton("Retirar", { acceso.retirar(fila) }, anchoBoton, variante = VarianteDeBoton.Contorno, icono = Iconos.cancelScheduleSend, habilitado = !ocupada)
                }
            }
        }
    }
}

/** `.m-club-access__status`: la píldora con borde de «Pendiente». */
@Composable
private fun Pendiente(modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    Text(
        "Pendiente",
        modifier.clip(RoundedCornerShape(50)).border(1.dp, colores.contorno, RoundedCornerShape(50)).padding(horizontal = Espacios.e2, vertical = Espacios.e1),
        color = colores.tintaSuave,
        style = Textos.cuerpo.copy(fontSize = rem(0.65)),
    )
}

