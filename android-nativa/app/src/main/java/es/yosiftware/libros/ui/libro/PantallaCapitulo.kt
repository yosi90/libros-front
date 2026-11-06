package es.yosiftware.libros.ui.libro

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.PopupProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EnlacesNarrativos
import es.yosiftware.libros.datos.rtf.TipoDeEnlace
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.elementos.ElementosViewModel
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2

/** Los enlaces de las palabras clave del libro (`buildNarrativeEntityLinks`). */
fun enlacesDe(libro: Libro): List<EnlaceNarrativo> = EnlacesNarrativos.construir(buildList {
    libro.personajes.forEach { personaje ->
        add(EnlaceNarrativo(personaje.id, TipoDeEnlace.PERSONAJE, personaje.nombre, personaje.nombre))
        personaje.apodos.forEach { add(EnlaceNarrativo(personaje.id, TipoDeEnlace.PERSONAJE, it.apodo, personaje.nombre)) }
    }
    libro.localizaciones.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.LOCALIZACION, it.nombre, it.nombre)) }
    libro.organizaciones.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.ORGANIZACION, it.nombre, it.nombre)) }
    libro.conceptos.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.CONCEPTO, it.nombre, it.nombre)) }
    libro.eventos.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.EVENTO, it.nombre, it.nombre)) }
    libro.citas.forEach { add(EnlaceNarrativo(it.id, TipoDeEnlace.CITA, it.nombre, it.nombre)) }
})

private fun elementoDe(tipo: TipoDeEnlace): Elemento = when (tipo) {
    TipoDeEnlace.PERSONAJE -> Elemento.PERSONAJES
    TipoDeEnlace.LOCALIZACION -> Elemento.LOCALIZACIONES
    TipoDeEnlace.ORGANIZACION -> Elemento.ORGANIZACIONES
    TipoDeEnlace.CONCEPTO -> Elemento.CONCEPTOS
    TipoDeEnlace.EVENTO -> Elemento.EVENTOS
    TipoDeEnlace.CITA -> Elemento.CITAS
}

/**
 * El capítulo con sus escenas, en «Escenas plegadas» (rediseño del 6/11/2026, opción A del propietario): el título y las
 * páginas van en la barra del libro, con el lápiz de sus datos; cada escena es una tarjeta plegada (número, título,
 * localización, dos líneas del texto y sus personajes) y solo la que se edita se despliega, con su título, la
 * localización, el texto, los personajes y «+», que abre la hoja de reparto ([HojaDeReparto]); en el texto, la @ añade
 * personajes ([SugerenciasDeMencion]). «+ Escena» al final y, en un capítulo nuevo, «Guardar capítulo». Lo escrito se
 * guarda solo ([CapituloViewModel]); al pasar a segundo plano o salir de la vista, en el acto.
 */
@Composable
fun PantallaCapitulo(libroVm: LibroViewModel, vista: VistaDelLibro, vm: CapituloViewModel, personajes: ElementosViewModel) {
    val colores = LocalColores.current
    val libro = libroVm.libro ?: return
    LaunchedEffect(libro) {
        vm.abrir(libro, vista)
        personajes.prepararAltaDesdeLaEscena(libro)
    }
    vm.alGuardar = libroVm::ponerCapitulo
    personajes.alGuardar = libroVm::recibirLibro
    val ciclo = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(vm, ciclo) {
        val observador = LifecycleEventObserver { _, evento -> if (evento == Lifecycle.Event.ON_STOP) vm.guardarAhora() }
        ciclo.addObserver(observador)
        onDispose {
            ciclo.removeObserver(observador)
            vm.guardarAhora()
            libroVm.cabeceraDelCapitulo = null
        }
    }
    val capitulo = vm.capitulo ?: return
    val cabecera = capitulo.nombre.trim().ifEmpty { "Capítulo ${capitulo.orden}" } to ReglasDelCapitulo.subtitulo(capitulo)
    SideEffect { if (libroVm.cabeceraDelCapitulo != cabecera) libroVm.cabeceraDelCapitulo = cabecera }
    val enlaces = remember(libro) { enlacesDe(libro) }
    val ancha = LocalVentana.current.anchoDp >= 600f
    val creador = remember(vm, personajes) { CreadorDePersonajes(personajes) }
    Box(Modifier.fillMaxSize().background(colores.lienzo)) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(start = if (ancha) Espacios.e6 else Espacios.e3, end = if (ancha) Espacios.e6 else Espacios.e3, top = Espacios.e3, bottom = if (ancha) Espacios.e6 else Espacios.e8),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 1040.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                CamposDelCapitulo(libroVm, vm, capitulo, ancha)
                capitulo.escenas.forEachIndexed { i, escena ->
                    if (escena.clave == vm.escenaAbierta) EscenaDesplegada(libroVm, vm, libro, capitulo, escena, i + 1, enlaces, creador)
                    else EscenaPlegada(vm, libro, capitulo, escena, i + 1)
                }
                BotonDeEscena(vm::anadirEscena)
                if (capitulo.esNuevo) Box(Modifier.heightIn(min = 56.dp))
            }
        }
        if (capitulo.esNuevo) {
            // `.m-chapter__save`: fijo abajo, a la derecha, con su sombra.
            Box(Modifier.align(Alignment.BottomEnd).padding(end = if (ancha) Espacios.e6 else Espacios.e4, bottom = Espacios.e3).sombra2(Radios.pildora, colores)) {
                Boton("Guardar capítulo", vm::guardarCapituloNuevo, icono = Iconos.save, habilitado = vm.estado != EstadoDelGuardado.GUARDANDO)
            }
        }
    }
    vm.repartoDe?.let { clave -> capitulo.escenas.firstOrNull { it.clave == clave } }.let { escena -> HojaDeReparto(vm, libro, escena, creador) }
    creador.Confirmacion()
}

/**
 * Los datos del capítulo (título, páginas y orden): se despliegan con el lápiz de la barra, y solos en un capítulo nuevo
 * o con algún dato mal. Raya debajo.
 */
@Composable
private fun CamposDelCapitulo(libroVm: LibroViewModel, vm: CapituloViewModel, capitulo: CapituloEditable, ancha: Boolean) {
    val colores = LocalColores.current
    var tocados by remember { mutableStateOf(emptySet<String>()) }
    val tocar = { campo: String -> tocados = tocados + campo }
    val conErrores = listOf(
        ReglasDelCapitulo.errorDeNombre(capitulo.nombre), ReglasDelCapitulo.errorDePagina(capitulo.pagina),
        ReglasDelCapitulo.errorDePaginaFinal(capitulo.paginaFinal), ReglasDelCapitulo.errorDeOrden(capitulo.orden),
    ).any { it != null }
    if (!capitulo.esNuevo && !conErrores && !libroVm.datosDelCapitulo) return
    val nombre: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDeNombre(capitulo.nombre)
        CampoNativo(
            "Título del capítulo", capitulo.nombre, { valor -> vm.cambiar { it.copy(nombre = valor.take(200)) } }, m,
            seleccionarSiEs = "Capítulo ${capitulo.orden}",
            nota = if (error != null && "nombre" in tocados) error else "${capitulo.nombre.length} / 200".takeIf { capitulo.nombre.length >= 180 },
            notaEsError = error != null && "nombre" in tocados,
            alSalir = { tocar("nombre") },
        )
    }
    val pagina: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDePagina(capitulo.pagina)
        CampoNativo("Página inicial", capitulo.pagina, { valor -> vm.cambiar { it.copy(pagina = valor.filter(Char::isDigit)) } }, m, numerico = true,
            nota = error?.takeIf { "pagina" in tocados }, notaEsError = true,
            alSalir = {
                tocar("pagina")
                // `syncEndPageFromStart`: si la final queda vacía o por debajo, pasa a ser la inicial.
                vm.cambiar { c -> if (ReglasDelCapitulo.errorDePagina(c.pagina) == null && (c.paginaFinal.isEmpty() || (c.paginaFinal.toIntOrNull() ?: 0) < c.pagina.toInt())) c.copy(paginaFinal = c.pagina) else c }
            })
    }
    val paginaFinal: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDePaginaFinal(capitulo.paginaFinal)
        CampoNativo("Página final", capitulo.paginaFinal, { valor -> vm.cambiar { it.copy(paginaFinal = valor.filter(Char::isDigit)) } }, m, numerico = true,
            nota = error?.takeIf { "paginaFinal" in tocados }, notaEsError = true,
            alSalir = {
                tocar("paginaFinal")
                // `syncStartPageFromEnd`: si la inicial queda vacía o por encima, pasa a ser la final.
                vm.cambiar { c -> if (c.paginaFinal.isNotEmpty() && ReglasDelCapitulo.errorDePaginaFinal(c.paginaFinal) == null && (c.pagina.isEmpty() || (c.pagina.toIntOrNull() ?: 0) > c.paginaFinal.toInt())) c.copy(pagina = c.paginaFinal) else c }
            })
    }
    val orden: @Composable (Modifier) -> Unit = { m ->
        val error = ReglasDelCapitulo.errorDeOrden(capitulo.orden)
        CampoNativo("Orden", capitulo.orden, { valor -> vm.cambiar { it.copy(orden = valor.filter(Char::isDigit)) } }, m, numerico = true,
            nota = error?.takeIf { "orden" in tocados }, notaEsError = true, alSalir = { tocar("orden") })
    }
    Column(
        Modifier.fillMaxWidth()
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .padding(bottom = Espacios.e3),
        verticalArrangement = Arrangement.spacedBy(Espacios.e2),
    ) {
        if (ancha) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                nombre(Modifier.weight(2f))
                pagina(Modifier.weight(0.65f))
                paginaFinal(Modifier.weight(0.65f))
                orden(Modifier.weight(0.65f))
            }
        } else {
            nombre(Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                pagina(Modifier.weight(1f))
                paginaFinal(Modifier.weight(1f))
                orden(Modifier.weight(1f))
            }
        }
    }
}

/** La tarjeta de una escena: superficie, radio de 18 dp y borde (2 dp del primario si está desplegada; del error si le falta algo). */
@Composable
private fun TarjetaDeEscena(desplegada: Boolean, conError: Boolean, modifier: Modifier = Modifier, contenido: @Composable () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    Column(
        Modifier.fillMaxWidth().clip(forma).then(modifier).background(colores.superficie)
            .border(if (desplegada) 2.dp else 1.dp, when {
                conError && !desplegada -> colores.error
                desplegada -> colores.primario
                else -> colores.contorno
            }, forma),
    ) { contenido() }
}

/** «1» en el primario y en negrita, delante del título. */
@Composable
private fun NumeroDeEscena(numero: Int) {
    Text(numero.toString(), style = Textos.cuerpo.copy(fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 1.2.em, color = LocalColores.current.primario))
}

/** Una escena plegada: tocarla la despliega (y pliega la otra). */
@Composable
private fun EscenaPlegada(vm: CapituloViewModel, libro: Libro, capitulo: CapituloEditable, escena: EscenaEditable, numero: Int) {
    val colores = LocalColores.current
    val conError = escena.tocada && !ReglasDelCapitulo.escenaValida(escena, capitulo.esNuevo)
    val lugar = libro.localizaciones.firstOrNull { it.id == escena.idLocalizacion }?.nombre?.takeUnless { ReglasDelCapitulo.localizacionNeutra(libro) == escena.idLocalizacion }
    val texto = ReglasDelCapitulo.textoPlano(escena)
    TarjetaDeEscena(desplegada = false, conError = conError, modifier = Modifier.clickable(role = Role.Button, onClickLabel = "Editar la escena $numero") { vm.abrirEscena(escena.clave) }) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = Espacios.e3), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                NumeroDeEscena(numero)
                Text(escena.nombre.ifBlank { "Escena $numero" }, style = Textos.cuerpo.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold, lineHeight = 1.25.em, color = colores.tinta), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                if (lugar != null) Text(lugar, style = Textos.cuerpo.copy(fontSize = 12.sp, lineHeight = 1.2.em, color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 150.dp))
            }
            if (texto.isNotEmpty()) Text(texto, style = Textos.cuerpo.copy(fontSize = 14.sp, lineHeight = 1.45.em, color = colores.tintaSuave), maxLines = 2, overflow = TextOverflow.Ellipsis)
            val fichas = ordenDeFichas(libro, escena.personajes)
            if (fichas.isNotEmpty()) {
                Text(
                    buildAnnotatedString {
                        fichas.forEachIndexed { i, personaje ->
                            if (i > 0) append(" · ")
                            val nombre = ReglasDelCapitulo.nombreDePersonaje(libro, personaje.id)
                            if (personaje.nombrado) withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append("@$nombre") } else append(nombre)
                        }
                    },
                    style = Textos.cuerpo.copy(fontSize = 12.5.sp, lineHeight = 1.3.em, color = colores.secundario),
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/** Los personajes de una escena como se enseñan: primero los presentes y después los nombrados, cada grupo por nombre. */
internal fun ordenDeFichas(libro: Libro, personajes: List<PersonajeEnEscena>): List<PersonajeEnEscena> =
    ReglasDelCapitulo.ordenarPersonajes(personajes) { ReglasDelCapitulo.nombreDePersonaje(libro, it) }.sortedBy { it.nombrado }

/** La escena que se edita: el título con «Eliminar», la localización en una píldora, el texto y sus personajes. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EscenaDesplegada(
    libroVm: LibroViewModel, vm: CapituloViewModel, libro: Libro, capitulo: CapituloEditable, escena: EscenaEditable,
    numero: Int, enlaces: List<EnlaceNarrativo>, creador: CreadorDePersonajes,
) {
    val colores = LocalColores.current
    TarjetaDeEscena(desplegada = true, conError = false) {
        Column(Modifier.padding(start = 14.dp, end = 4.dp, top = 4.dp, bottom = Espacios.e3), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
                NumeroDeEscena(numero)
                TituloDeEscena(vm, escena, numero, Modifier.weight(1f))
                MenuDeEscena(vm, escena, numero)
            }
            Column(Modifier.padding(end = 10.dp), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                PildoraDeLocalizacion(vm, libro, escena)
                EditorRtf(
                    valor = escena.descripcion,
                    alCambiar = { nuevo -> vm.cambiarEscena(escena.clave) { it.copy(descripcion = nuevo) } },
                    modifier = Modifier.fillMaxWidth(),
                    enlaces = enlaces,
                    alAbrirEnlace = { enlace -> libroVm.ir(VistaDelLibro.DeElemento(elementoDe(enlace.tipo), seleccionado = enlace.id)) },
                    idLibro = libroVm.abierto?.id,
                    descripcion = "Descripción de la escena $numero",
                    seleccionarTodoAlEnfocar = ReglasDelCapitulo.esDescripcionPorDefecto(escena.descripcion),
                    alTerminarDeEditar = vm::guardarAhora,
                    barraSoloAlEscribir = true,
                    menciones = { consulta, sustituir -> SugerenciasDeMencion(vm, libro, escena, creador, consulta, sustituir) },
                )
                if (!ReglasDelCapitulo.descripcionValida(escena)) {
                    Text("La descripción es requerida (mínimo 15 caracteres).", style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error))
                }
                if (!capitulo.esNuevo && escena.personajes.isEmpty()) {
                    Text("Necesita al menos un personaje presente o nombrado.", style = Textos.cuerpo.copy(fontSize = rem(0.75), color = colores.error))
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                    ordenDeFichas(libro, escena.personajes).forEach { personaje -> FichaDePersonaje(vm, libro, escena, personaje) }
                    BotonDeAnadirPersonaje { vm.abrirReparto(escena.clave) }
                }
            }
        }
    }
}

/** El título de la escena, en línea con la raya de debajo (sin caja), 15 sp en negrita. */
@Composable
private fun TituloDeEscena(vm: CapituloViewModel, escena: EscenaEditable, numero: Int, modifier: Modifier) {
    val colores = LocalColores.current
    val error = ReglasDelCapitulo.errorDeNombreDeEscena(escena)?.takeIf { escena.tocada }
    var campo by remember { mutableStateOf(TextFieldValue(escena.nombre)) }
    if (campo.text != escena.nombre) campo = campo.copy(text = escena.nombre, selection = TextRange(minOf(campo.selection.start, escena.nombre.length), minOf(campo.selection.end, escena.nombre.length)))
    var teniaFoco by remember { mutableStateOf(false) }
    Column(modifier) {
        BasicTextField(
            value = campo,
            onValueChange = { nuevo ->
                campo = nuevo
                if (nuevo.text != escena.nombre) vm.cambiarEscena(escena.clave) { it.copy(nombre = nuevo.text) }
            },
            singleLine = true,
            textStyle = Textos.cuerpo.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold, lineHeight = 1.25.em, color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            modifier = Modifier.fillMaxWidth()
                .semantics { contentDescription = "Título de la escena $numero" }
                .onFocusChanged { estado ->
                    // `selectDefaultText`: «Escena N» se selecciona entero al entrar.
                    if (estado.isFocused && !teniaFoco && escena.nombre == "Escena $numero") campo = campo.copy(selection = TextRange(0, escena.nombre.length))
                    teniaFoco = estado.isFocused
                },
            decorationBox = { interior ->
                Box(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp)
                        .drawBehind { drawRect(if (error != null) colores.error else colores.contorno, Offset(0f, size.height - 6.dp.toPx()), Size(size.width, 1.dp.toPx())) }
                        .padding(bottom = 6.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (escena.nombre.isEmpty()) Text("Título de la escena", style = Textos.cuerpo.copy(fontSize = 15.sp, color = colores.tintaSuave))
                    interior()
                }
            },
        )
        if (error != null) Text(error, style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.SemiBold, color = colores.error))
    }
}

/** «⋯» de la escena: eliminarla. */
@Composable
private fun MenuDeEscena(vm: CapituloViewModel, escena: EscenaEditable, numero: Int) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    Box {
        Box(
            Modifier.size(44.dp).clip(RoundedCornerShape(50)).clickable(role = Role.Button) { abierto = true }
                .semantics { contentDescription = "Más opciones de la escena $numero" },
            contentAlignment = Alignment.Center,
        ) { Icon(painterResource(Iconos.moreHoriz), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(20.dp)) }
        DropdownMenu(abierto, onDismissRequest = { abierto = false }, containerColor = colores.superficie) {
            DropdownMenuItem(
                text = { Text("Eliminar escena", style = Textos.cuerpo.copy(color = colores.error)) },
                leadingIcon = { Icon(painterResource(Iconos.delete), contentDescription = null, tint = colores.error, modifier = Modifier.size(20.dp)) },
                onClick = { abierto = false; vm.quitarEscena(escena.clave) },
            )
        }
    }
}

/**
 * La localización como píldora (32 dp de alto, 44 de objetivo): al tocarla, su buscador (sin tildes) con las del libro;
 * solo vale una de la lista. Sin ninguna elegida, «Localización».
 */
@Composable
private fun PildoraDeLocalizacion(vm: CapituloViewModel, libro: Libro, escena: EscenaEditable) {
    val colores = LocalColores.current
    var abierto by remember { mutableStateOf(false) }
    var buscado by remember { mutableStateOf("") }
    val elegida = libro.localizaciones.firstOrNull { it.id == escena.idLocalizacion }?.nombre
    val consulta = plegar(buscado).trim()
    val opciones = libro.localizaciones.filter { consulta.isEmpty() || plegar(it.nombre).trim().contains(consulta) }
    val conError = escena.tocada && !ReglasDelCapitulo.localizacionValida(escena)
    val neutra = ReglasDelCapitulo.localizacionNeutra(libro) != null
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Box {
            Box(
                Modifier.heightIn(min = 44.dp).clickable(role = Role.Button, onClickLabel = "Cambiar la localización") { abierto = true },
                contentAlignment = Alignment.CenterStart,
            ) {
                val forma = RoundedCornerShape(50)
                Row(
                    Modifier.height(32.dp).clip(forma).background(colores.lienzo).border(1.dp, if (conError) colores.error else colores.contorno, forma).padding(horizontal = Espacios.e3),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(painterResource(Iconos.myLocation), contentDescription = null, tint = colores.tintaSuave, modifier = Modifier.size(14.dp))
                    Text(elegida ?: "Localización", style = Textos.cuerpo.copy(fontSize = 13.sp, lineHeight = 1.2.em, color = if (elegida != null) colores.tinta else colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 240.dp))
                }
            }
            DropdownMenu(abierto, onDismissRequest = { abierto = false; buscado = "" }, containerColor = colores.superficie, modifier = Modifier.widthIn(min = 240.dp, max = 320.dp)) {
                CampoNativo(
                    etiqueta = null, valor = buscado, alCambiar = { buscado = it }, modifier = Modifier.padding(horizontal = Espacios.e2).fillMaxWidth(),
                    ejemplo = "Buscar localización", iconoFinal = Iconos.search, nombreAccesible = "Buscar localización",
                )
                if (opciones.isEmpty()) DropdownMenuItem(text = { Text("No hay localizaciones disponibles", style = Textos.cuerpo.copy(color = colores.tintaSuave)) }, onClick = {}, enabled = false)
                opciones.forEach { lugar ->
                    DropdownMenuItem(
                        text = { Text(lugar.nombre, style = Textos.cuerpo.copy(color = colores.tinta, fontWeight = if (lugar.id == escena.idLocalizacion) FontWeight.Bold else FontWeight.Normal)) },
                        onClick = { abierto = false; buscado = ""; vm.elegirLocalizacion(escena.clave, lugar.id) },
                    )
                }
            }
        }
        val nota = when {
            !neutra -> "El libro no incluye «Sin localización»."
            conError -> "Selecciona una localización de la lista."
            else -> null
        }
        if (nota != null) Text(nota, style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.SemiBold, color = colores.error))
    }
}

/** «+ Escena» al final: 48 dp, borde discontinuo, en el primario. */
@Composable
private fun BotonDeEscena(alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    Row(
        Modifier.fillMaxWidth().height(48.dp).clip(forma)
            .drawBehind {
                val ancho = 1.dp.toPx()
                drawRoundRect(colores.contornoFuerte, Offset(ancho / 2, ancho / 2), Size(size.width - ancho, size.height - ancho), CornerRadius(Radios.md.toPx()), style = Stroke(ancho, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))))
            }
            .clickable(role = Role.Button, onClickLabel = "Nueva escena", onClick = alPulsar),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(Iconos.add), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
        Text("Escena", style = Textos.boton.copy(fontSize = 15.sp, color = colores.primario))
    }
}

/**
 * `.m-native-field`: la etiqueta (`.72rem`, 800, tinta suave), el campo de 44 dp (borde del contorno fuerte, radio
 * pequeño, superficie; con el foco, borde del primario y halo) y la nota de debajo (`.68rem`, 600; en rojo si es error).
 * Al enfocarlo, si su texto es [seleccionarSiEs] (el de por defecto), se selecciona entero (`selectDefaultText`).
 */
@Composable
internal fun CampoNativo(
    etiqueta: String?,
    valor: String,
    alCambiar: (String) -> Unit,
    modifier: Modifier,
    numerico: Boolean = false,
    seleccionarSiEs: String? = null,
    nota: String? = null,
    notaEsError: Boolean = false,
    ejemplo: String? = null,
    @DrawableRes iconoFinal: Int? = null,
    habilitado: Boolean = true,
    alEnfocar: () -> Unit = {},
    alSalir: () -> Unit = {},
    /** Para el lector de pantalla, si no lleva etiqueta. */
    nombreAccesible: String? = null,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val interaccion = remember { MutableInteractionSource() }
    val enfocado by interaccion.collectIsFocusedAsState()
    var campo by remember { mutableStateOf(TextFieldValue(valor)) }
    if (campo.text != valor) campo = campo.copy(text = valor, selection = TextRange(minOf(campo.selection.start, valor.length), minOf(campo.selection.end, valor.length)))
    var teniaFoco by remember { mutableStateOf(false) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (etiqueta != null) Text(etiqueta, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        BasicTextField(
            value = campo,
            onValueChange = { nuevo ->
                campo = nuevo
                if (nuevo.text != valor) alCambiar(nuevo.text)
            },
            enabled = habilitado,
            singleLine = true,
            textStyle = Textos.cuerpo.copy(fontSize = rem(0.795), fontWeight = FontWeight.Medium, lineHeight = 1.2.em, color = colores.tinta),
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = if (numerico) KeyboardType.Number else KeyboardType.Text),
            interactionSource = interaccion,
            modifier = Modifier.fillMaxWidth()
                .semantics { (etiqueta ?: nombreAccesible)?.let { contentDescription = it } }
                .onFocusChanged { estado ->
                    if (estado.isFocused && !teniaFoco) {
                        alEnfocar()
                        if (seleccionarSiEs != null && valor == seleccionarSiEs) campo = campo.copy(selection = TextRange(0, valor.length))
                    }
                    if (!estado.isFocused && teniaFoco) alSalir()
                    teniaFoco = estado.isFocused
                },
            decorationBox = { interior ->
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp)
                        .drawBehind {
                            if (enfocado) drawRoundRect(mezclar(colores.primario, 0.18f), Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), androidx.compose.ui.geometry.CornerRadius(Radios.sm.toPx() + 2.dp.toPx()))
                        }
                        .background(colores.superficie, forma)
                        .border(1.dp, if (enfocado) colores.primario else colores.contornoFuerte, forma)
                        .padding(start = Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.weight(1f).padding(end = if (iconoFinal == null) Espacios.e2 else 0.dp)) {
                        if (valor.isEmpty() && ejemplo != null) Text(ejemplo, style = Textos.cuerpo.copy(fontSize = rem(0.775), color = colores.tintaSuave), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        interior()
                    }
                    if (iconoFinal != null) Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                        Icon(painterResource(iconoFinal), contentDescription = null, tint = colores.primario, modifier = Modifier.size(20.dp))
                    }
                }
            },
        )
        if (nota != null) Text(nota, style = Textos.cuerpo.copy(fontSize = rem(0.68), fontWeight = FontWeight.SemiBold, color = if (notaEsError) colores.error else colores.tintaSuave))
    }
}
