package es.yosiftware.libros.ui.comunidad

import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Cargando
import es.yosiftware.libros.ui.componentes.ListaVacia
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
    // Las secciones van con la palabra, arriba, también en el plegable: sin segundo rail (ronda 1 de interfaz, opción A).
    Column(Modifier.fillMaxSize().background(colores.lienzo)) {
        Row(
            Modifier.fillMaxWidth().background(mezclar(colores.superficieContenedor, 0.24f))
                .drawBehind { drawLine(mezclar(colores.contorno, 0.58f), Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx()) }
                .horizontalScroll(rememberScrollState()).padding(horizontal = if (ancha) Espacios.e2 else Espacios.e3, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) { Secciones(comunidad, acciones, sinLeer) }
        Box(Modifier.weight(1f)) { contenido() }
    }
}

/**
 * Las secciones propias y las de la web social (`.m-social-shell__navigation`), con la palabra y sin icono. Las de la
 * web social llevan el símbolo delante; Mensajes, la insignia de los no leídos.
 */
@Composable
private fun Secciones(comunidad: ComunidadViewModel, acciones: AccionesDeComunidad, sinLeer: Int) {
    SeccionDeComunidad.entries.forEach { seccion ->
        val disponible = seccion != SeccionDeComunidad.CLUBES || comunidad.clubesDisponibles
        val insignia = if (seccion == SeccionDeComunidad.MENSAJES) sinLeer else 0
        PestanaDePalabra(
            seccion.etiqueta, activa = comunidad.seccion == seccion, habilitada = disponible, insignia = insignia,
            descripcion = if (insignia > 0) "${seccion.etiqueta}, $insignia sin leer" else null,
            alPulsar = {
                if (seccion == SeccionDeComunidad.MENSAJES) acciones.alElegirMensajes()
                comunidad.abrir(seccion)
            },
        )
    }
    EnlaceSocial.entries.forEach { enlace ->
        PestanaDePalabra(
            enlace.etiqueta, activa = false, simbolo = true, descripcion = "${enlace.etiqueta}, en la web social",
            alPulsar = { acciones.abrirWebSocial(enlace.vista) },
        )
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
        if (comunidad.parcial) Aviso("Parte del resumen no está disponible.")
        when {
            comunidad.cargandoResumen && comunidad.tarjetas.isEmpty() -> Cargando("Cargando el resumen", alturaMinima = 240.dp)
            comunidad.errorDelResumen.isNotEmpty() -> EstadoDePantalla(
                Iconos.cloudOff, comunidad.errorDelResumen, titulo = "No pudimos cargar el resumen", error = true, alturaMinima = 240,
                boton = "Reintentar" to comunidad::cargarResumen,
            )
            else -> Rejilla(ResumenSocialDeComunidad.conMensajes(comunidad.tarjetas, sinLeer), columnas = if (ancha) 2 else 1) { tarjeta ->
                ElementoDeLista(
                    "${tarjeta.valor}", tarjeta.etiqueta,
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
            clubes.cargando -> Cargando("Cargando la comunidad", alturaMinima = 220.dp)
            clubes.falloDeCarga -> EstadoDePantalla(Iconos.cloudOff, null, titulo = "No pudimos cargar esta sección", error = true, boton = "Reintentar" to clubes::cargarDescubrir)
            else -> Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                // Las cuatro pestañas, con la palabra (ronda 1 de interfaz).
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    PestanaDeClubes.entries.forEach { pestana ->
                        val insignia = if (pestana == PestanaDeClubes.ACCESO) acceso.pendientes else 0
                        PestanaDePalabra(
                            pestana.etiqueta,
                            activa = clubes.pestana == pestana,
                            alPulsar = { clubes.elegir(pestana) },
                            habilitada = !pestana.necesitaClubes || clubes.tieneClubes,
                            insignia = insignia,
                            enCaja = true,
                            descripcion = if (insignia > 0) "${pestana.etiqueta}, $insignia pendientes" else null,
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
    val columnas = if (LocalVentana.current.anchoDp >= 600) 2 else 1
    // El buscador, vacío y con la lupa como botón, y «Crear club» en la misma fila (ronda 1 de interfaz).
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        BarraDeBusqueda(clubes.busqueda, clubes::escribirBusqueda, "Buscar un club", clubes::buscar, clubes.buscando, Modifier.weight(1f))
        Boton(
            if (clubes.creadorAbierto) "Cerrar" else "Crear club", clubes::alternarCreador,
            variante = VarianteDeBoton.Tonal, habilitado = tieneObras, rellenoHorizontal = Espacios.e4,
        )
    }
    CreacionDeClub.restriccion(tieneObras)?.let { Pista(it) }
    if (clubes.creadorAbierto) CreadorDeClub(clubes, tieneObras)
    // «Descubrir» repetía la pestaña: las dos listas son «Populares» y «Todos».
    if (clubes.busqueda.isEmpty() && clubes.populares.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            TituloDeLista("Populares")
            Rejilla(clubes.populares, columnas) { club ->
                ElementoDeLista(club.nombre, "${club.miembros} miembros · ${club.actividad30Dias?.total ?: 0} actividades", { comunidad.abrirClub(club.id) }, Modifier.fillMaxHeight())
            }
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        TituloDeLista("Todos")
        if (clubes.descubrir.isEmpty()) ListaVacia("Sin clubes")
        Rejilla(clubes.descubrir, columnas) { club ->
            ElementoDeLista(club.nombre, "${club.miembros} miembros · ${EtiquetasDeClubes.membresia(club.estadoMembresia)}", { comunidad.abrirClub(club.id) }, Modifier.fillMaxHeight())
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
        if (clubes.cargandoMisClubes && clubes.misClubes.isEmpty()) Cargando("Cargando tus clubes", alturaMinima = 96.dp)
        if (!clubes.cargandoMisClubes && clubes.misClubes.isEmpty()) ListaVacia("Sin clubes")
        Rejilla(clubes.misClubes, if (LocalVentana.current.anchoDp >= 600) 2 else 1) { club ->
            val privado = if (club.retiradoDescubrimiento == true) " · privado" else ""
            ElementoDeLista(club.nombre, EtiquetasDeClubes.rol(club.rol) + privado, { comunidad.abrirClub(club.id) }, Modifier.fillMaxHeight())
        }
    }
}

@Composable
private fun ColumnScope.Eventos(comunidad: ComunidadViewModel, clubes: ClubesViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        if (clubes.cargandoEventos && clubes.eventos.isEmpty()) Cargando("Cargando los próximos eventos", alturaMinima = 96.dp)
        if (!clubes.cargandoEventos && clubes.eventos.isEmpty()) ListaVacia("Sin eventos")
        Rejilla(clubes.eventos, if (LocalVentana.current.anchoDp >= 600) 2 else 1) { evento ->
            // Sin el icono, «en curso» va en palabras: era lo único que decía el reloj.
            val enCurso = if (evento.enCurso) " · en curso" else ""
            ElementoDeLista(
                evento.titulo, "${evento.club.nombre} · ${FechasDeClubes.diaYHora(evento.fechaInicio)}$enCurso",
                { comunidad.abrirClub(evento.club.id) }, Modifier.fillMaxHeight(),
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
                insignia = acceso.pendientesDe(TipoDeAcceso.INVITACIONES))
            FiltroEnCaja("Solicitudes", acceso.tipo == TipoDeAcceso.SOLICITUDES, { acceso.elegirTipo(TipoDeAcceso.SOLICITUDES) }, Modifier.weight(1f),
                insignia = acceso.pendientesDe(TipoDeAcceso.SOLICITUDES))
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
        if (acceso.cargando && filas.isEmpty()) Cargando("Cargando los accesos", alturaMinima = 160.dp)
        if (filas.isEmpty() && !acceso.cargando && acceso.error.isEmpty()) ListaVacia(acceso.mensajeVacio)
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
                    Boton(acceso.textoDeAceptar, { acceso.aceptar(fila) }, anchoBoton, habilitado = !ocupada)
                    Boton("Rechazar", { acceso.rechazar(fila) }, anchoBoton, variante = VarianteDeBoton.Contorno, habilitado = !ocupada)
                } else {
                    Boton("Retirar", { acceso.retirar(fila) }, anchoBoton, variante = VarianteDeBoton.Contorno, habilitado = !ocupada)
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

