package es.yosiftware.libros.ui.perfil

import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import es.yosiftware.libros.datos.modelos.ActividadReciente
import es.yosiftware.libros.datos.modelos.GrupoDeReportes
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.biblioteca.iconoDeEstado
import es.yosiftware.libros.ui.biblioteca.nombreDeEstado
import es.yosiftware.libros.ui.catalogo.FormularioDePeticion
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Cargando
import es.yosiftware.libros.ui.componentes.ListaVacia
import es.yosiftware.libros.ui.componentes.Portada
import es.yosiftware.libros.ui.componentes.Superficie
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoTitulo
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

// El Perfil de la APK: src/app/components/mobile/user/mobile-profile-view/, con el Sass de la APK de Capacitor
// (5dc3120) y el contenido de después de la adhesión (sin país, privacidad ni identidad pública, que son de la
// plataforma). Una columna de hasta 760 dp; desde 600 dp, las cifras del resumen a la derecha.

/** Lo que el Perfil enseña de la cuenta, que es de la plataforma. */
data class IdentidadDelPerfil(val nombre: String, val alias: String?, val avatar: String?)

@Composable
fun PantallaPerfil(
    vm: PerfilViewModel,
    identidad: IdentidadDelPerfil,
    /** «Libros» y «Universos», de la colección ([Perfil.recuentos]). */
    recuentos: Pair<Int, Int>,
    alAbrirActividad: (ActividadReciente) -> Unit,
    /** «Corregir y reenviar» una petición devuelta: el formulario de petición del Catálogo, relleno con lo enviado. */
    alCorregirPeticion: (PeticionDeCatalogo) -> Unit,
    /** El avatar y el lápiz: el perfil de Yosiftware, que se edita en la web social. */
    alEditarPerfil: () -> Unit,
    alVerPerfilEnLaWeb: () -> Unit,
    /** Al volver a la app tras abrir el perfil para editarlo: releer el nombre y el avatar. */
    alVolverDeEditar: () -> Unit,
) {
    val colores = LocalColores.current
    val ancha = LocalVentana.current.anchoDp >= 600
    var editando by rememberSaveable { mutableStateOf(false) }
    val editar = {
        editando = true
        alEditarPerfil()
    }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        if (editando) {
            editando = false
            alVolverDeEditar()
        }
    }
    LaunchedEffect(Unit) { vm.alEntrar() }
    BackHandler(enabled = vm.seccion != SeccionDelPerfil.RESUMEN) { vm.volver() }
    Box(Modifier.fillMaxSize().background(colores.lienzo), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.widthIn(max = 760.dp).fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(start = if (ancha) Espacios.e6 else Espacios.e4, end = if (ancha) Espacios.e6 else Espacios.e4, top = if (ancha) Espacios.e6 else Espacios.e4, bottom = Espacios.e8),
            verticalArrangement = Arrangement.spacedBy(if (ancha) Espacios.e7 else Espacios.e6),
        ) {
            when (vm.seccion) {
                SeccionDelPerfil.RESUMEN -> {
                    Heroe(vm, identidad, recuentos, ancha, editar)
                    // Sin actividad, el bloque no se pinta (ronda 1 de interfaz, F1).
                    if (vm.actividad.isNotEmpty() || vm.cargandoActividad || vm.falloActividad) {
                        Bloque("Actividad reciente") { Actividad(vm, alAbrirActividad) }
                    }
                    Destinos(vm)
                }
                else -> {
                    CabeceraDeDetalle(vm.seccion.titulo, vm::volver)
                    when (vm.seccion) {
                        SeccionDelPerfil.PERFIL -> TuPerfil(identidad, editar, alVerPerfilEnLaWeb)
                        SeccionDelPerfil.PETICIONES -> Peticiones(vm, alCorregirPeticion)
                        SeccionDelPerfil.REPORTES -> Reportes(vm)
                        SeccionDelPerfil.RESUMEN -> Unit
                    }
                }
            }
        }
    }
}

// --- Resumen. ---

/** `.m-profile__hero`: el avatar, el nombre y el alias, y las cuatro cifras (debajo en el móvil, a la derecha desde 600). */
@Composable
private fun Heroe(vm: PerfilViewModel, identidad: IdentidadDelPerfil, recuentos: Pair<Int, Int>, ancha: Boolean, alEditarPerfil: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.lg)
    val cifras = listOf("Libros" to recuentos.first, "En marcha" to vm.enMarcha, "Leídos" to vm.leidos, "Universos" to recuentos.second)
    Column(
        Modifier.fillMaxWidth().clip(forma)
            .background(mezclar(colores.contenedorPrimario, 0.34f, colores.superficie))
            .border(1.dp, mezclar(colores.primario, 0.16f), forma)
            .padding(if (ancha) Espacios.e6 else Espacios.e4),
    ) {
        Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            AvatarEditable(identidad, if (ancha) 112.dp else 76.dp, alEditarPerfil)
            Column(Modifier.weight(1f)) {
                Text(
                    identidad.nombre,
                    Modifier.semantics { heading() },
                    color = colores.tinta,
                    style = Textos.titulo(LocalVentana.current.anchoDp).copy(fontSize = (LocalVentana.current.anchoDp * 0.05f).coerceIn(16f, 1.3f * 16).sp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    Perfil.arroba(identidad.alias),
                    Modifier.padding(top = Espacios.e1),
                    color = colores.tintaSuave,
                    style = Textos.cuerpo.copy(fontSize = rem(0.84)),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            if (ancha) {
                // `.m-profile__hero-metrics` desde 600: una columna con la raya a la izquierda.
                Column(
                    Modifier.fillMaxHeight().widthIn(min = 128.dp)
                        .drawBehind { drawLine(mezclar(colores.primario, 0.2f), Offset(0f, 0f), Offset(0f, size.height), 1.dp.toPx()) }
                        .padding(start = Espacios.e3),
                    verticalArrangement = Arrangement.spacedBy(2.dp, Alignment.CenterVertically),
                ) {
                    cifras.forEach { (etiqueta, valor) ->
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                            Text(etiqueta, Modifier.weight(1f, fill = false), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.62)), maxLines = 1)
                            Text("$valor", Modifier.width(22.dp), color = colores.primario, style = cifra(0.85), textAlign = TextAlign.End)
                        }
                    }
                }
            }
        }
        if (!ancha) {
            // `.m-profile__hero-metrics` en el móvil: dos por fila, con rayas entre ellas.
            val raya = mezclar(colores.primario, 0.16f)
            Column(
                Modifier.fillMaxWidth().padding(top = Espacios.e3)
                    .drawBehind { drawLine(mezclar(colores.primario, 0.2f), Offset(0f, 0f), Offset(size.width, 0f), 1.dp.toPx()) }
                    .padding(top = Espacios.e3),
            ) {
                cifras.chunked(2).forEachIndexed { fila, par ->
                    if (fila > 0) HorizontalDivider(thickness = 1.dp, color = raya)
                    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                        par.forEachIndexed { columna, (etiqueta, valor) ->
                            if (columna > 0) Box(Modifier.width(1.dp).fillMaxHeight().background(raya))
                            Row(
                                Modifier.weight(1f).heightIn(min = 38.dp).padding(horizontal = Espacios.e3, vertical = Espacios.e2),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(etiqueta, Modifier.weight(1f), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.68)), maxLines = 1)
                                Text("$valor", color = colores.primario, style = cifra(0.9))
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun cifra(tamano: Double) = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.Bold, fontSize = rem(tamano), lineHeight = rem(tamano))

/** `.m-profile__avatar`: la foto con borde de 3 dp y sombra, y la insignia del lápiz abajo a la derecha. */
@Composable
private fun AvatarEditable(identidad: IdentidadDelPerfil, tamano: Dp, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Box(
        Modifier.size(tamano).semantics { contentDescription = "Editar tu perfil de Yosiftware" }
            .clickable(role = Role.Button, onClick = alPulsar),
    ) {
        Box(
            Modifier.fillMaxSize().sombra2(CircleShape, colores).clip(CircleShape)
                .background(colores.superficieContenedor).border(3.dp, colores.superficie, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Avatar(tamano - 6.dp, url = identidad.avatar, nombre = identidad.nombre, conBorde = false)
        }
        Box(
            Modifier.align(Alignment.BottomEnd).offset(3.dp, 3.dp).size(34.dp).clip(CircleShape)
                .background(colores.superficie).padding(3.dp).clip(CircleShape).background(colores.primario),
            contentAlignment = Alignment.Center,
        ) {
            Icon(painterResource(Iconos.edit), contentDescription = null, tint = colores.sobrePrimario, modifier = Modifier.size(16.dp))
        }
    }
}

/** `.m-profile__block` con su título, sin antetítulo (ronda 1 de interfaz, F1). */
@Composable
private fun Bloque(titulo: String, contenido: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        Text(
            titulo,
            Modifier.semantics { heading() },
            color = LocalColores.current.tinta,
            style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.SemiBold, fontSize = rem(1.25), lineHeight = rem(1.25 * 1.15)),
        )
        contenido()
    }
}

@Composable
private fun Actividad(vm: PerfilViewModel, alAbrir: (ActividadReciente) -> Unit) {
    val colores = LocalColores.current
    when {
        vm.actividad.isNotEmpty() -> Superficie(Modifier.fillMaxWidth()) {
            vm.actividad.forEachIndexed { i, actividad ->
                if (i > 0) HorizontalDivider(thickness = 1.dp, color = colores.contorno)
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 82.dp).clickable(role = Role.Button) { alAbrir(actividad) }
                        .padding(horizontal = Espacios.e3, vertical = Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
                ) {
                    Portada(actividad.portada, null, Modifier.size(44.dp, 64.dp).clip(RoundedCornerShape(Radios.xs)))
                    Column(Modifier.weight(1f)) {
                        Text(actividad.nombre, color = colores.tinta, style = Textos.filaPrincipal, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(Perfil.autores(actividad.autores), Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.nota, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    // El estado, solo con su icono y su nombre accesible, como en las tarjetas de la biblioteca.
                    actividad.estado?.let { estado ->
                        Icon(painterResource(iconoDeEstado(estado.tipo)), contentDescription = nombreDeEstado(estado), tint = colores.primario, modifier = Modifier.size(20.dp))
                    }
                    Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.width(32.dp))
                }
            }
        }
        vm.cargandoActividad -> Cargando("Cargando tu actividad reciente")
        vm.falloActividad -> Vacio("No se ha podido cargar tu actividad reciente.")
    }
}

/**
 * `.m-profile__destinations`: Perfil, Mis peticiones y Mis reportes, con su total; sin título, icono ni subtítulo
 * (ronda 1 de interfaz, F1).
 */
@Composable
private fun Destinos(vm: PerfilViewModel) {
    val colores = LocalColores.current
    val destinos = listOf(
        SeccionDelPerfil.PERFIL to 0,
        SeccionDelPerfil.PETICIONES to vm.peticiones.size,
        SeccionDelPerfil.REPORTES to vm.reportes.size,
    )
    Superficie(Modifier.fillMaxWidth()) {
        destinos.forEachIndexed { i, (seccion, total) ->
            if (i > 0) HorizontalDivider(thickness = 1.dp, color = colores.contorno)
            Row(
                Modifier.fillMaxWidth().heightIn(min = 52.dp).clickable(role = Role.Button) { vm.abrir(seccion) }
                    .padding(start = Espacios.e4, end = Espacios.e3, top = Espacios.e2, bottom = Espacios.e2),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
            ) {
                Text(seccion.titulo, Modifier.weight(1f), color = colores.tinta, style = Textos.filaPrincipal)
                if (total > 0) {
                    Text(
                        "$total",
                        Modifier.widthIn(min = 24.dp).clip(RoundedCornerShape(50)).background(colores.contenedorPrimario).padding(horizontal = 7.dp, vertical = 4.dp),
                        color = colores.sobreContenedorPrimario,
                        style = Textos.cuerpo.copy(fontSize = rem(0.7), fontWeight = FontWeight.Bold),
                        textAlign = TextAlign.Center,
                    )
                }
                Icon(painterResource(Iconos.chevronRight), contentDescription = null, tint = colores.tintaSuave)
            }
        }
    }
}

// --- Detalle. ---

/** `.m-profile__detail-heading`: la flecha al resumen y el título de la sección, sin antetítulo (ronda 1 de interfaz, F2). */
@Composable
private fun CabeceraDeDetalle(titulo: String, alVolver: () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        BotonDeIcono(Iconos.arrowBack, "Volver al resumen del perfil", { alVolver() })
        TextoTitulo(titulo, Modifier.weight(1f))
    }
}

/** «Perfil»: la foto, el nombre y el alias de la cuenta, el lápiz y «Ver tu perfil en la web social». */
@Composable
private fun TuPerfil(identidad: IdentidadDelPerfil, alEditar: () -> Unit, alVerEnLaWeb: () -> Unit) {
    val colores = LocalColores.current
    Superficie(Modifier.fillMaxWidth().semantics { contentDescription = "Tu perfil de Yosiftware" }) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 72.dp).padding(Espacios.e3),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        ) {
            Avatar(42.dp, url = identidad.avatar, nombre = identidad.nombre)
            Column(Modifier.weight(1f)) {
                Text(identidad.nombre, color = colores.tinta, style = Textos.filaPrincipal)
                Text(Perfil.arroba(identidad.alias), Modifier.padding(top = 3.dp), color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.75)), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            BotonDeIcono(Iconos.edit, "Editar tu perfil de Yosiftware", alEditar, Modifier.size(44.dp), color = colores.primario)
        }
        // En la web, el enlace va pegado al borde de la tarjeta; aquí, con el margen de la fila de encima.
        Boton(
            "Ver tu perfil en la web social", alVerEnLaWeb,
            Modifier.fillMaxWidth().padding(start = Espacios.e3, end = Espacios.e3, bottom = Espacios.e3),
            variante = VarianteDeBoton.Tonal, icono = Iconos.simboloYosiftware,
        )
    }
}

/** `.m-profile__panel > header`: el resumen de la lista y el botón de actualizar. */
@Composable
private fun CabeceraDePanel(texto: String, descripcion: String, alActualizar: () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        Text(texto, Modifier.weight(1f), color = LocalColores.current.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.82)))
        BotonDeIcono(Iconos.refresh, descripcion, alActualizar)
    }
}

@Composable
private fun Peticiones(vm: PerfilViewModel, alCorregir: (PeticionDeCatalogo) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        val total = vm.peticiones.size
        CabeceraDePanel(if (total > 0) "$total registradas" else "", "Actualizar peticiones", vm::cargarPeticiones)
        when {
            total > 0 -> vm.peticiones.forEach { TarjetaDePeticion(vm, it, alCorregir) }
            vm.cargandoPeticiones -> Cargando("Cargando tus peticiones")
            vm.falloPeticiones -> Vacio("No se han podido cargar tus peticiones.")
            else -> ListaVacia("Sin peticiones")
        }
    }
}

@Composable
private fun TarjetaDePeticion(vm: PerfilViewModel, peticion: PeticionDeCatalogo, alCorregir: (PeticionDeCatalogo) -> Unit) {
    val colores = LocalColores.current
    Documento("${Perfil.etiquetaDeEntidad(peticion.tipoEntidad)} · ${Perfil.etiquetaDeAccion(peticion)}", Perfil.etiquetaDeEstado(peticion.estado)) {
        val campos = Perfil.campos(peticion.payload)
        if (campos.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                campos.forEach { campo ->
                    Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                        Text(campo.etiqueta, Modifier.weight(0.35f).widthIn(min = 90.dp), color = colores.tintaSuave, style = Textos.nota)
                        Text(campo.valor, Modifier.weight(1f), color = colores.tinta, style = Textos.cuerpo)
                    }
                }
            }
        }
        if (peticion.estado != "pendiente") Parrafo("Respuesta:", Perfil.resolucion(peticion.comentarioResolucion))
        if (peticion.estado == "devuelta") {
            val enviando = peticion.id in vm.reenviando
            AreaDeTexto(vm.respuestas[peticion.id].orEmpty(), { vm.escribirRespuesta(peticion.id, it) }, "Tu respuesta")
            Boton("Reenviar", { vm.reenviar(peticion) }, Modifier.fillMaxWidth().alpha(if (enviando) 0.45f else 1f), habilitado = !enviando)
            // Corregir los datos (el ISBN, por ejemplo) antes de reenviar; las de tipo `otro`, solo con el comentario.
            if (FormularioDePeticion.reenvio(peticion) != null) {
                Boton("Corregir y reenviar", { alCorregir(peticion) }, Modifier.fillMaxWidth(), variante = VarianteDeBoton.Contorno, habilitado = !enviando)
            }
        }
    }
}

@Composable
private fun Reportes(vm: PerfilViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
        val total = vm.reportes.size
        CabeceraDePanel(if (total > 0) "$total registrados" else "", "Actualizar reportes", vm::cargarReportes)
        when {
            total > 0 -> vm.reportes.forEach { TarjetaDeReporte(it) }
            vm.cargandoReportes -> Cargando("Cargando tus reportes")
            vm.falloReportes -> Vacio("No se han podido cargar tus reportes.")
            else -> ListaVacia("Sin reportes")
        }
    }
}

@Composable
private fun TarjetaDeReporte(grupo: GrupoDeReportes) {
    val colores = LocalColores.current
    val titulo = grupo.fuente?.obra?.nombre?.takeIf { it.isNotBlank() } ?: Perfil.etiquetaDeEntidad(grupo.entidadTipo)
    Documento(titulo, Perfil.etiquetaDeEstado(grupo.estado)) {
        Text(grupo.fuente?.resena?.takeIf { it.isNotBlank() } ?: "Reseña no disponible", color = colores.tinta, style = Textos.cuerpo)
        grupo.resolucion?.let { Parrafo("Resolución:", Perfil.resolucion(it.comentario)) }
    }
}

/** `.m-profile__document.m-card`: el título, el estado en su píldora y el contenido, a 12 dp. */
@Composable
private fun Documento(titulo: String, estado: String, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    Tarjeta(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3)) {
                Text(titulo, Modifier.weight(1f), color = colores.tinta, style = Textos.filaPrincipal)
                Text(
                    estado,
                    Modifier.clip(RoundedCornerShape(50)).background(colores.contenedorExito).padding(horizontal = Espacios.e2, vertical = Espacios.e1),
                    color = colores.exito,
                    style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.ExtraBold),
                )
            }
            contenido()
        }
    }
}

/** Un `<p>` con su `<strong>` delante. */
@Composable
private fun Parrafo(negrita: String, texto: String) {
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(negrita) }
            append(" ")
            append(texto)
        },
        color = LocalColores.current.tinta,
        style = Textos.cuerpo,
    )
}

/** El `<textarea>` de `.m-profile__document`: 112 dp de alto como mínimo, borde fuerte y radio de 12 dp. */
@Composable
private fun AreaDeTexto(valor: String, alCambiar: (String) -> Unit, ejemplo: String) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    BasicTextField(
        valor, alCambiar,
        Modifier.fillMaxWidth().heightIn(min = 112.dp).clip(forma).background(colores.superficie).border(1.dp, colores.contornoFuerte, forma),
        textStyle = Textos.cuerpo.copy(color = colores.tinta),
        cursorBrush = SolidColor(colores.primario),
        decorationBox = { interior ->
            Box(Modifier.padding(Espacios.e3)) {
                if (valor.isEmpty()) Text(ejemplo, color = colores.tintaSuave, style = Textos.cuerpo)
                interior()
            }
        },
    )
}

/** `.m-profile__empty`: el borde discontinuo con el texto centrado. */
@Composable
private fun Vacio(texto: String) {
    val colores = LocalColores.current
    Box(
        Modifier.fillMaxWidth().heightIn(min = 112.dp)
            .drawBehind {
                drawRoundRect(
                    colores.contornoFuerte, cornerRadius = CornerRadius(Radios.md.toPx()),
                    style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 3.dp.toPx()))),
                )
            }
            .padding(Espacios.e5),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = colores.tintaSuave, style = Textos.cuerpo, textAlign = TextAlign.Center)
    }
}
